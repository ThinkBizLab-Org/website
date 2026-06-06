// Video plan (manifest) for the hybrid short-video pipeline.
//
// A VideoPlan describes a vertical 9:16 short as an ordered list of scenes.
// It is emitted by the Content Factory AI alongside the article, or built
// deterministically from article fields as a fallback. This module is pure
// (no IO) so the manifest contract can be unit-tested in isolation.

export type SceneType = 'hook' | 'data' | 'keypoint' | 'quote' | 'cta'

// How a scene's *background* is produced. On-screen text is always rendered
// natively by the compositor (never by an AI model), which keeps Thai text
// crisp and correct regardless of this value.
export type SceneBackground = 'solid' | 'brand' | 'flux' | 'broll'

export type VideoFormat = 'motion_graphics' | 'hybrid' | 'cinematic' | 'talking_head'

export type VideoScene = {
  type: SceneType
  text: string
  bg: SceneBackground
  bgPrompt?: string
  stat?: string
  label?: string
  model?: string
  durationSec: number
}

export type VideoPlan = {
  format: VideoFormat
  durationSec: number
  voiceover: boolean
  voiceoverScript?: string
  scenes: VideoScene[]
}

export const VIDEO_LIMITS = {
  minDurationSec: 12,
  maxDurationSec: 34,
  minSceneSec: 2,
  maxSceneSec: 12,
  maxScenes: 8,
} as const

const SCENE_TYPES: SceneType[] = ['hook', 'data', 'keypoint', 'quote', 'cta']
const SCENE_BGS: SceneBackground[] = ['solid', 'brand', 'flux', 'broll']
const VIDEO_FORMATS: VideoFormat[] = ['motion_graphics', 'hybrid', 'cinematic', 'talking_head']

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asSceneType(value: unknown): SceneType {
  return SCENE_TYPES.includes(value as SceneType) ? (value as SceneType) : 'keypoint'
}

function asBackground(value: unknown): SceneBackground {
  return SCENE_BGS.includes(value as SceneBackground) ? (value as SceneBackground) : 'solid'
}

function asFormat(value: unknown): VideoFormat {
  return VIDEO_FORMATS.includes(value as VideoFormat) ? (value as VideoFormat) : 'motion_graphics'
}

function parseScene(raw: unknown): VideoScene | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const text = asString(source.text)
  const stat = asString(source.stat)
  // A scene needs *something* to show: on-screen text, a stat, or an image prompt.
  if (!text && !stat && !asString(source.bgPrompt)) return null
  const durationRaw = Number(source.durationSec)
  return {
    type: asSceneType(source.type),
    text,
    bg: asBackground(source.bg),
    bgPrompt: asString(source.bgPrompt) || undefined,
    stat: stat || undefined,
    label: asString(source.label) || undefined,
    model: asString(source.model) || undefined,
    durationSec: Number.isFinite(durationRaw) && durationRaw > 0
      ? clamp(durationRaw, VIDEO_LIMITS.minSceneSec, VIDEO_LIMITS.maxSceneSec)
      : 4,
  }
}

// Lenient parse: accept a JSON string or already-parsed object. Returns null
// when there is nothing usable so callers can fall back to a built plan.
export function parseVideoPlan(raw: unknown): VideoPlan | null {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  } else {
    return null
  }

  const scenes = Array.isArray(source.scenes)
    ? source.scenes.map(parseScene).filter((s): s is VideoScene => s !== null)
    : []
  if (scenes.length === 0) return null

  const declared = Number(source.durationSec)
  const plan: VideoPlan = {
    format: asFormat(source.format),
    durationSec: Number.isFinite(declared) && declared > 0 ? declared : 0,
    voiceover: source.voiceover === true || source.voiceover === 'true',
    voiceoverScript: asString(source.voiceoverScript) || undefined,
    scenes,
  }
  return validateVideoPlan(plan)
}

// Normalize a plan against the limits: cap scene count, clamp scene durations,
// and reconcile total duration with the sum of scene durations.
export function validateVideoPlan(plan: VideoPlan): VideoPlan {
  const scenes = plan.scenes.slice(0, VIDEO_LIMITS.maxScenes).map(scene => ({
    ...scene,
    durationSec: clamp(scene.durationSec, VIDEO_LIMITS.minSceneSec, VIDEO_LIMITS.maxSceneSec),
  }))
  const summed = scenes.reduce((total, scene) => total + scene.durationSec, 0)
  const durationSec = clamp(
    summed || plan.durationSec || VIDEO_LIMITS.minDurationSec,
    VIDEO_LIMITS.minDurationSec,
    VIDEO_LIMITS.maxDurationSec,
  )
  return { ...plan, scenes, durationSec }
}

export type FallbackPlanInput = {
  title: string
  excerpt?: string | null
  keyPoints?: string[] | null
  format: VideoFormat
  voiceover: boolean
}

// Deterministic fallback used when the AI did not emit a usable manifest.
// Builds a hook → key points → CTA structure from existing article fields.
export function buildFallbackVideoPlan(input: FallbackPlanInput): VideoPlan {
  const keyPoints = (input.keyPoints ?? []).map(p => p.trim()).filter(Boolean).slice(0, 4)
  const hookBg: SceneBackground = input.format === 'motion_graphics' ? 'brand' : 'flux'

  const scenes: VideoScene[] = [
    {
      type: 'hook',
      text: input.title.trim(),
      bg: hookBg,
      bgPrompt: hookBg === 'flux' ? `editorial business backdrop for: ${input.title}` : undefined,
      durationSec: 4,
    },
    ...keyPoints.map((point): VideoScene => ({
      type: 'keypoint',
      text: point,
      bg: 'solid',
      durationSec: 5,
    })),
    {
      type: 'cta',
      text: 'ติดตาม ThinkBiz Lab',
      bg: 'brand',
      durationSec: 3,
    },
  ]

  // Guarantee at least one substantive scene when the article has no key points.
  if (keyPoints.length === 0 && input.excerpt) {
    scenes.splice(1, 0, { type: 'keypoint', text: input.excerpt.trim().slice(0, 140), bg: 'solid', durationSec: 5 })
  }

  return validateVideoPlan({
    format: input.format,
    durationSec: 0,
    voiceover: input.voiceover,
    voiceoverScript: [input.title, input.excerpt, ...keyPoints].filter(Boolean).join('\n\n').slice(0, 1200) || undefined,
    scenes,
  })
}
