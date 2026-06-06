import { describe, expect, it } from 'vitest'
import {
  VIDEO_LIMITS,
  buildFallbackVideoPlan,
  parseVideoPlan,
  validateVideoPlan,
} from '@/lib/video-plan'

describe('video plan', () => {
  it('parses a valid manifest and clamps duration to scene sum', () => {
    const plan = parseVideoPlan(JSON.stringify({
      format: 'hybrid',
      durationSec: 999,
      voiceover: true,
      scenes: [
        { type: 'hook', text: 'พาดหัว', bg: 'flux', bgPrompt: 'office', durationSec: 4 },
        { type: 'keypoint', text: 'ข้อ 1', bg: 'solid', durationSec: 6 },
        { type: 'cta', text: 'ติดตาม', bg: 'brand', durationSec: 3 },
      ],
    }))
    expect(plan).not.toBeNull()
    expect(plan!.format).toBe('hybrid')
    expect(plan!.durationSec).toBe(13) // 4+6+3
    expect(plan!.scenes).toHaveLength(3)
  })

  it('returns null when there are no usable scenes', () => {
    expect(parseVideoPlan(JSON.stringify({ format: 'hybrid', scenes: [] }))).toBeNull()
    expect(parseVideoPlan('not json')).toBeNull()
    expect(parseVideoPlan(null)).toBeNull()
  })

  it('drops empty scenes and defaults unknown enums', () => {
    const plan = parseVideoPlan({
      format: 'nonsense',
      scenes: [
        { type: 'weird', bg: 'rainbow', text: '', stat: '', bgPrompt: '' }, // empty → dropped
        { type: 'data', stat: '70%', bg: 'solid' },
      ],
    })
    expect(plan!.format).toBe('motion_graphics') // unknown → default
    expect(plan!.scenes).toHaveLength(1)
    expect(plan!.scenes[0].type).toBe('data')
  })

  it('clamps scene count and total duration within limits', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ type: 'keypoint', text: `ข้อ ${i}`, bg: 'solid', durationSec: 10 }))
    const plan = validateVideoPlan({ format: 'motion_graphics', durationSec: 0, voiceover: false, scenes: many as never })
    expect(plan.scenes.length).toBe(VIDEO_LIMITS.maxScenes)
    expect(plan.durationSec).toBeLessThanOrEqual(VIDEO_LIMITS.maxDurationSec)
    expect(plan.durationSec).toBeGreaterThanOrEqual(VIDEO_LIMITS.minDurationSec)
  })

  it('builds a fallback plan from article fields', () => {
    const plan = buildFallbackVideoPlan({
      title: 'ทำไม SME ต้องคุม cashflow',
      excerpt: 'สรุปสั้น ๆ',
      keyPoints: ['จุดที่ 1', 'จุดที่ 2'],
      format: 'motion_graphics',
      voiceover: true,
    })
    expect(plan.scenes[0].type).toBe('hook')
    expect(plan.scenes.at(-1)!.type).toBe('cta')
    expect(plan.scenes.some(s => s.text === 'จุดที่ 1')).toBe(true)
    expect(plan.voiceoverScript).toContain('ทำไม SME')
  })

  it('fallback still produces a body scene when there are no key points', () => {
    const plan = buildFallbackVideoPlan({ title: 'หัวข้อ', excerpt: 'เนื้อหาสรุป', keyPoints: [], format: 'hybrid', voiceover: true })
    expect(plan.scenes.length).toBeGreaterThanOrEqual(3)
    expect(plan.scenes.some(s => s.text.includes('เนื้อหาสรุป'))).toBe(true)
  })
})
