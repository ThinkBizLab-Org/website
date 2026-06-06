// Video router: decides the video *format* and resolves each scene's
// background to a concrete producer (native compositor / flux image / fal
// video) while enforcing cost and quality guardrails. Pure and deterministic
// so routing decisions are fully unit-testable.

import {
  buildFallbackVideoPlan,
  parseVideoPlan,
  validateVideoPlan,
  type VideoFormat,
  type VideoPlan,
  type VideoScene,
} from './video-plan'

// How a scene's background is actually generated at render time.
//   native    → drawn by the compositor (solid colour / brand template)
//   flux      → still image from fal/flux, panned with Ken Burns motion
//   fal-video → AI-generated B-roll clip (the expensive path)
export type SceneSource = 'native' | 'flux' | 'fal-video'

export type RoutedScene = VideoScene & { source: SceneSource }

export type RoutedVideoPlan = {
  format: VideoFormat
  durationSec: number
  voiceover: boolean
  voiceoverScript?: string
  scenes: RoutedScene[]
  warnings: string[]
}

export type RouteContext = {
  maxBrollScenes: number
  maxDurationSec: number
  minDurationSec: number
  // When the monthly AI budget is exhausted, all paid B-roll is downgraded to
  // the cheap flux-still path so the pipeline keeps producing within budget.
  budgetExceeded: boolean
}

export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  maxBrollScenes: 1,
  maxDurationSec: 30,
  minDurationSec: 12,
  budgetExceeded: false,
}

// Deterministic format pick used when there is no AI plan and no manual
// override. Data-heavy finance content → pure motion graphics; narrative
// categories → hybrid (graphics over generated imagery).
export function pickFallbackFormat(category: string | null | undefined, keyPoints: string[] | null | undefined): VideoFormat {
  const cat = (category ?? '').toLowerCase()
  const dataHeavy = ['finance', 'investment'].some(c => cat.includes(c))
  if (dataHeavy) return 'motion_graphics'
  const narrative = ['global case', 'strategy', 'startup'].some(c => cat.includes(c))
  if (narrative && (keyPoints?.length ?? 0) > 0) return 'hybrid'
  return 'motion_graphics'
}

function normalizeFormat(raw: unknown): VideoFormat | null {
  const formats: VideoFormat[] = ['motion_graphics', 'hybrid', 'cinematic', 'talking_head']
  return formats.includes(raw as VideoFormat) ? (raw as VideoFormat) : null
}

export type ResolvePlanInput = {
  // Raw manifest as stored on the article (AI-emitted), if any.
  videoPlan?: unknown
  // Manual editor override of the format, if any.
  videoFormat?: string | null
  title: string
  excerpt?: string | null
  keyPoints?: string[] | null
  category?: string | null
  allowTalkingHead: boolean
  // Learned/explored format to use when there is no AI plan and no manual
  // override. Falls back to the deterministic heuristic when absent.
  fallbackFormat?: VideoFormat | null
}

// Produce a usable VideoPlan from an article: prefer the AI manifest, fall
// back to a deterministic plan. A manual format override always wins.
export function getOrBuildVideoPlan(input: ResolvePlanInput): VideoPlan {
  const override = normalizeFormat(input.videoFormat)
  const parsed = parseVideoPlan(input.videoPlan)

  if (parsed) {
    const format = guardFormat(override ?? parsed.format, input.allowTalkingHead)
    return validateVideoPlan({ ...parsed, format })
  }

  const format = guardFormat(override ?? input.fallbackFormat ?? pickFallbackFormat(input.category, input.keyPoints), input.allowTalkingHead)
  return buildFallbackVideoPlan({
    title: input.title,
    excerpt: input.excerpt,
    keyPoints: input.keyPoints,
    format,
    voiceover: true,
  })
}

// talking_head requires the HeyGen path to be enabled; otherwise degrade to
// motion graphics so a plan never asks for a disabled producer.
function guardFormat(format: VideoFormat, allowTalkingHead: boolean): VideoFormat {
  if (format === 'talking_head' && !allowTalkingHead) return 'motion_graphics'
  return format
}

// Decide a single scene's background source, given how many paid B-roll clips
// have already been allocated and whether the budget allows another.
export function routeScene(scene: VideoScene, allocatedBroll: number, ctx: RouteContext): { source: SceneSource; downgraded: boolean } {
  if (scene.bg === 'broll') {
    const blocked = ctx.budgetExceeded || allocatedBroll >= Math.max(0, ctx.maxBrollScenes)
    return blocked ? { source: 'flux', downgraded: true } : { source: 'fal-video', downgraded: false }
  }
  if (scene.bg === 'flux') return { source: 'flux', downgraded: false }
  return { source: 'native', downgraded: false }
}

// Resolve a whole plan into routed scenes with guardrails applied.
export function resolveVideoPlan(plan: VideoPlan, ctx: RouteContext = DEFAULT_ROUTE_CONTEXT): RoutedVideoPlan {
  const warnings: string[] = []
  let allocatedBroll = 0

  const scenes: RoutedScene[] = plan.scenes.map(scene => {
    const { source, downgraded } = routeScene(scene, allocatedBroll, ctx)
    if (source === 'fal-video') allocatedBroll += 1
    if (downgraded) {
      warnings.push(`scene "${scene.type}" B-roll downgraded to still image (${ctx.budgetExceeded ? 'budget exceeded' : 'B-roll quota reached'})`)
      // Reflect the downgrade in the scene background so the renderer is consistent.
      return { ...scene, bg: 'flux', source }
    }
    return { ...scene, source }
  })

  const durationSec = Math.max(ctx.minDurationSec, Math.min(ctx.maxDurationSec, plan.durationSec))
  if (durationSec !== plan.durationSec) {
    warnings.push(`duration clamped from ${plan.durationSec}s to ${durationSec}s`)
  }

  return {
    format: plan.format,
    durationSec,
    voiceover: plan.voiceover,
    voiceoverScript: plan.voiceoverScript,
    scenes,
    warnings,
  }
}

// Convenience: count how many scenes will use each producer (handy for cost
// estimation and tests).
export function summarizeSources(routed: RoutedVideoPlan): Record<SceneSource, number> {
  const summary: Record<SceneSource, number> = { native: 0, flux: 0, 'fal-video': 0 }
  for (const scene of routed.scenes) summary[scene.source] += 1
  return summary
}
