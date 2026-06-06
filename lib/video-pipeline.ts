// Pure helpers for the multi-stage short-video production state machine.
//
// A short_video job advances through stages across queue "waiting" cycles,
// reusing the existing scheduledAt/poll mechanism:
//   assets   → generate per-scene backgrounds (flux / fal-video) + TTS voice
//   render   → submit the composition to the Remotion Lambda renderer, poll
//   finalize → download the rendered mp4 and upload to R2
// Keeping the transitions and the renderer input-shape pure makes the
// orchestration in the processor thin and testable.

import type { RoutedScene, RoutedVideoPlan } from './video-router'
import type { CaptionTiming, RemotionCaption, RemotionInputProps } from './video-shared-types'

export type { CaptionTiming, RemotionCaption, RemotionInputProps, RemotionSceneProps } from './video-shared-types'

export type VideoStage = 'assets' | 'render' | 'finalize'

export const VIDEO_STAGES: VideoStage[] = ['assets', 'render', 'finalize']

export function nextVideoStage(current: VideoStage): VideoStage | null {
  const index = VIDEO_STAGES.indexOf(current)
  if (index < 0 || index >= VIDEO_STAGES.length - 1) return null
  return VIDEO_STAGES[index + 1]
}

// Progress carried on the queue item between waiting cycles.
export type VideoProgress = {
  stage: VideoStage
  // Resolved background asset URL per scene index (flux still or fal-video clip).
  sceneBgUrls?: Record<number, string>
  // Voiceover audio URL once synthesized + uploaded.
  voiceUrl?: string
  // Caption timings (seconds) from the TTS provider, for word-synced subtitles.
  captionTimings?: CaptionTiming[]
  // Pending fal-video B-roll jobs keyed by scene index, awaiting completion.
  pendingBroll?: Record<number, string>
  // Remotion Lambda render id once submitted.
  renderId?: string
  renderBucket?: string
}

export function isVideoProgress(value: unknown): value is VideoProgress {
  if (!value || typeof value !== 'object') return false
  const stage = (value as VideoProgress).stage
  return VIDEO_STAGES.includes(stage)
}

export const REMOTION_VIDEO = { fps: 30, width: 1080, height: 1920 } as const

// Build the renderer input from a routed plan and the resolved assets. When a
// voiceover script is present it is also turned into a timed caption track so
// the spoken narration appears as subtitles (sound-off viewing).
export function buildRemotionInputProps(
  routed: RoutedVideoPlan,
  assets: { sceneBgUrls?: Record<number, string>; voiceUrl?: string; captionTimings?: CaptionTiming[] },
): RemotionInputProps {
  // Prefer real TTS timestamps; fall back to proportional timing from the script.
  const captions = !assets.voiceUrl
    ? undefined
    : assets.captionTimings && assets.captionTimings.length
      ? captionsFromTimings(assets.captionTimings, REMOTION_VIDEO.fps)
      : routed.voiceoverScript
        ? buildCaptionTrack(routed.voiceoverScript, routed.durationSec, REMOTION_VIDEO.fps)
        : undefined
  return {
    format: routed.format,
    durationSec: routed.durationSec,
    fps: REMOTION_VIDEO.fps,
    width: REMOTION_VIDEO.width,
    height: REMOTION_VIDEO.height,
    voiceUrl: assets.voiceUrl,
    captions,
    scenes: routed.scenes.map((scene, index) => ({
      type: scene.type,
      text: scene.text,
      stat: scene.stat,
      label: scene.label,
      bg: scene.bg,
      backgroundUrl: assets.sceneBgUrls?.[index],
      durationSec: scene.durationSec,
    })),
  }
}

// Rough characters-per-second for Thai TTS narration. Used to estimate spoken
// length and pace captions without round-tripping to the TTS provider.
const SPEECH_CHARS_PER_SEC = 11

export function estimateSpeechSeconds(text: string): number {
  const len = text.replace(/\s+/g, '').length
  return Math.max(1, Math.ceil(len / SPEECH_CHARS_PER_SEC))
}

// Trim a narration script so it speaks in at most maxSeconds, cutting at the
// nearest sentence boundary (falling back to a word boundary). Keeps short-form
// videos within the Reels/TikTok sweet spot instead of running long.
export function clampScriptToSeconds(script: string, maxSeconds: number): string {
  const text = script.trim()
  if (estimateSpeechSeconds(text) <= maxSeconds) return text
  const budget = Math.max(1, maxSeconds * SPEECH_CHARS_PER_SEC)
  if (text.length <= budget) return text
  const slice = text.slice(0, budget)
  const boundary = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('\n'),
  )
  if (boundary > budget * 0.5) return slice.slice(0, boundary + 1).trim()
  const space = slice.lastIndexOf(' ')
  return (space > budget * 0.5 ? slice.slice(0, space) : slice).trim()
}

// Split narration into subtitle segments timed proportionally to their length
// across the full video duration.
export function buildCaptionTrack(script: string, totalDurationSec: number, fps: number): RemotionCaption[] {
  const segments = script
    .split(/(?<=[.!?。…])\s+|\n+/)
    .flatMap(part => chunkText(part.trim(), 60))
    .filter(Boolean)
  if (segments.length === 0) return []

  const totalFrames = Math.max(1, Math.round(totalDurationSec * fps))
  const totalChars = segments.reduce((sum, s) => sum + s.length, 0) || 1
  let cursor = 0
  return segments.map((text, index) => {
    const share = Math.max(1, Math.round((text.length / totalChars) * totalFrames))
    const fromFrame = cursor
    const durationInFrames = index === segments.length - 1 ? Math.max(1, totalFrames - cursor) : share
    cursor += durationInFrames
    return { text, fromFrame, durationInFrames }
  })
}

// Convert TTS timestamp segments (seconds) into frame-based caption sequences.
export function captionsFromTimings(timings: CaptionTiming[], fps: number): RemotionCaption[] {
  return timings
    .filter(t => t.text.trim())
    .map(t => ({
      text: t.text.trim(),
      fromFrame: Math.max(0, Math.round(t.startSec * fps)),
      durationInFrames: Math.max(1, Math.round((t.endSec - t.startSec) * fps)),
    }))
}

// Group ElevenLabs per-character alignment into readable caption segments,
// breaking on sentence punctuation or a max length. Pure.
export function captionsFromAlignment(
  characters: string[],
  startTimes: number[],
  endTimes: number[],
  maxLen = 50,
): CaptionTiming[] {
  const out: CaptionTiming[] = []
  let text = ''
  let start = 0
  for (let i = 0; i < characters.length; i++) {
    if (text === '') start = startTimes[i] ?? 0
    text += characters[i] ?? ''
    const isBreak = /[.!?。…\n]/.test(characters[i] ?? '') || text.length >= maxLen
    const isLast = i === characters.length - 1
    if (isBreak || isLast) {
      const trimmed = text.trim()
      if (trimmed) out.push({ text: trimmed, startSec: start, endSec: endTimes[i] ?? start })
      text = ''
    }
  }
  return out
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return text ? [text] : []
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += maxLen) chunks.push(text.slice(i, i + maxLen))
  return chunks
}

// Stretch scene durations so the video is at least as long as the narration
// (capped at maxDurationSec), preserving the original proportions.
export function reconcileSceneDurations<T extends { durationSec: number }>(
  scenes: T[],
  voiceSeconds: number,
  maxDurationSec: number,
): T[] {
  const currentSum = scenes.reduce((sum, s) => sum + s.durationSec, 0)
  const target = Math.min(maxDurationSec, Math.max(currentSum, voiceSeconds))
  if (scenes.length === 0 || target <= currentSum) return scenes
  const scale = target / currentSum
  return scenes.map(scene => ({ ...scene, durationSec: Math.max(1, Math.round(scene.durationSec * scale)) }))
}

// Scenes that still need an image/clip generated before rendering.
export function scenesNeedingBackground(routed: RoutedVideoPlan): { index: number; scene: RoutedScene }[] {
  return routed.scenes
    .map((scene, index) => ({ index, scene }))
    .filter(({ scene }) => scene.source === 'flux' || scene.source === 'fal-video')
}
