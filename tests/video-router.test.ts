import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ROUTE_CONTEXT,
  getOrBuildVideoPlan,
  pickFallbackFormat,
  resolveVideoPlan,
  routeScene,
  summarizeSources,
} from '@/lib/video-router'
import type { VideoPlan, VideoScene } from '@/lib/video-plan'

const scene = (over: Partial<VideoScene> = {}): VideoScene => ({
  type: 'keypoint', text: 'ข้อความ', bg: 'solid', durationSec: 5, ...over,
})

const plan = (scenes: VideoScene[], over: Partial<VideoPlan> = {}): VideoPlan => ({
  format: 'hybrid', durationSec: 20, voiceover: true, scenes, ...over,
})

describe('video router — format selection', () => {
  it('routes finance/investment to motion graphics, narrative to hybrid', () => {
    expect(pickFallbackFormat('Finance', ['a'])).toBe('motion_graphics')
    expect(pickFallbackFormat('Investment', [])).toBe('motion_graphics')
    expect(pickFallbackFormat('Global Case', ['a'])).toBe('hybrid')
    expect(pickFallbackFormat('Strategy', [])).toBe('motion_graphics') // narrative but no key points
    expect(pickFallbackFormat(null, null)).toBe('motion_graphics')
  })
})

describe('video router — scene routing', () => {
  it('maps backgrounds to producers', () => {
    expect(routeScene(scene({ bg: 'solid' }), 0, DEFAULT_ROUTE_CONTEXT).source).toBe('native')
    expect(routeScene(scene({ bg: 'brand' }), 0, DEFAULT_ROUTE_CONTEXT).source).toBe('native')
    expect(routeScene(scene({ bg: 'flux' }), 0, DEFAULT_ROUTE_CONTEXT).source).toBe('flux')
    expect(routeScene(scene({ bg: 'broll' }), 0, DEFAULT_ROUTE_CONTEXT).source).toBe('fal-video')
  })

  it('downgrades B-roll beyond the quota to a flux still', () => {
    const ctx = { ...DEFAULT_ROUTE_CONTEXT, maxBrollScenes: 1 }
    expect(routeScene(scene({ bg: 'broll' }), 0, ctx)).toEqual({ source: 'fal-video', downgraded: false })
    expect(routeScene(scene({ bg: 'broll' }), 1, ctx)).toEqual({ source: 'flux', downgraded: true })
  })

  it('downgrades all B-roll when the budget is exceeded', () => {
    const ctx = { ...DEFAULT_ROUTE_CONTEXT, budgetExceeded: true, maxBrollScenes: 3 }
    expect(routeScene(scene({ bg: 'broll' }), 0, ctx)).toEqual({ source: 'flux', downgraded: true })
  })
})

describe('video router — resolve plan', () => {
  it('limits paid B-roll to the configured quota and records warnings', () => {
    const routed = resolveVideoPlan(
      plan([scene({ bg: 'broll' }), scene({ bg: 'broll' }), scene({ bg: 'broll' })]),
      { ...DEFAULT_ROUTE_CONTEXT, maxBrollScenes: 1 },
    )
    const sources = summarizeSources(routed)
    expect(sources['fal-video']).toBe(1)
    expect(sources.flux).toBe(2) // the two over-quota broll downgraded
    expect(routed.warnings.length).toBe(2)
    // downgraded scenes have their background switched to flux for the renderer
    expect(routed.scenes.filter(s => s.bg === 'flux').length).toBe(2)
  })

  it('clamps duration to the configured window', () => {
    const routed = resolveVideoPlan(plan([scene()], { durationSec: 200 }), { ...DEFAULT_ROUTE_CONTEXT, maxDurationSec: 30 })
    expect(routed.durationSec).toBe(30)
    expect(routed.warnings.some(w => w.includes('duration clamped'))).toBe(true)
  })
})

describe('video router — getOrBuildVideoPlan', () => {
  it('prefers the AI manifest when present', () => {
    const built = getOrBuildVideoPlan({
      videoPlan: { format: 'cinematic', scenes: [{ type: 'hook', text: 'x', bg: 'flux', bgPrompt: 'p', durationSec: 5 }] },
      title: 'T', allowTalkingHead: true,
    })
    expect(built.format).toBe('cinematic')
  })

  it('honours a manual format override over the manifest', () => {
    const built = getOrBuildVideoPlan({
      videoPlan: { format: 'cinematic', scenes: [{ type: 'hook', text: 'x', bg: 'solid', durationSec: 5 }] },
      videoFormat: 'motion_graphics', title: 'T', allowTalkingHead: true,
    })
    expect(built.format).toBe('motion_graphics')
  })

  it('falls back to a built plan from category when no manifest', () => {
    const built = getOrBuildVideoPlan({ title: 'หัวข้อ', category: 'Finance', keyPoints: ['a', 'b'], allowTalkingHead: true })
    expect(built.format).toBe('motion_graphics')
    expect(built.scenes[0].type).toBe('hook')
  })

  it('degrades talking_head to motion_graphics when not allowed', () => {
    const built = getOrBuildVideoPlan({ videoFormat: 'talking_head', title: 'T', allowTalkingHead: false })
    expect(built.format).toBe('motion_graphics')
  })
})
