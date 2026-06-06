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

// Input props handed to the Remotion composition. Scenes reference resolved
// background URLs (if any); text/stat/label drive native overlays.
export type RemotionSceneProps = {
  type: RoutedScene['type']
  text: string
  stat?: string
  label?: string
  bg: RoutedScene['bg']
  backgroundUrl?: string
  durationSec: number
}

export type RemotionInputProps = {
  format: RoutedVideoPlan['format']
  durationSec: number
  fps: number
  width: number
  height: number
  voiceUrl?: string
  scenes: RemotionSceneProps[]
}

export const REMOTION_VIDEO = { fps: 30, width: 1080, height: 1920 } as const

// Build the renderer input from a routed plan and the resolved assets.
export function buildRemotionInputProps(
  routed: RoutedVideoPlan,
  assets: { sceneBgUrls?: Record<number, string>; voiceUrl?: string },
): RemotionInputProps {
  return {
    format: routed.format,
    durationSec: routed.durationSec,
    fps: REMOTION_VIDEO.fps,
    width: REMOTION_VIDEO.width,
    height: REMOTION_VIDEO.height,
    voiceUrl: assets.voiceUrl,
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

// Scenes that still need an image/clip generated before rendering.
export function scenesNeedingBackground(routed: RoutedVideoPlan): { index: number; scene: RoutedScene }[] {
  return routed.scenes
    .map((scene, index) => ({ index, scene }))
    .filter(({ scene }) => scene.source === 'flux' || scene.source === 'fal-video')
}
