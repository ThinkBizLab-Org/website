import { describe, expect, it } from 'vitest'
import {
  applyBrandVoiceToSystem,
  formatBrandVoiceGuidance,
  isBrandVoiceEmpty,
  parseBrandVoice,
} from '@/lib/brand-voice'

describe('brand voice memory', () => {
  it('parses tone/audience and splits list fields from text or arrays', () => {
    const profile = parseBrandVoice({
      tone: '  confident  ',
      audience: 'Thai SME owners',
      dos: ['use real examples', '', 'be concise'],
      donts: 'avoid jargon\n\navoid hype',
      keywords: ['ThinkBiz', 'growth'],
    })
    expect(profile.tone).toBe('confident')
    expect(profile.audience).toBe('Thai SME owners')
    expect(profile.dos).toEqual(['use real examples', 'be concise'])
    expect(profile.donts).toEqual(['avoid jargon', 'avoid hype'])
    expect(profile.keywords).toEqual(['ThinkBiz', 'growth'])
  })

  it('tolerates malformed json', () => {
    expect(isBrandVoiceEmpty(parseBrandVoice('not json'))).toBe(true)
    expect(isBrandVoiceEmpty(parseBrandVoice(null))).toBe(true)
  })

  it('formats a guidance block only when there is content', () => {
    expect(formatBrandVoiceGuidance(parseBrandVoice({}))).toBe('')
    const block = formatBrandVoiceGuidance(parseBrandVoice({ tone: 'friendly', keywords: ['x', 'y'] }))
    expect(block).toContain('Brand voice guidelines')
    expect(block).toContain('Tone: friendly')
    expect(block).toContain('x, y')
  })

  it('appends guidance to a system prompt, leaving it untouched when empty', () => {
    expect(applyBrandVoiceToSystem('BASE', parseBrandVoice({}))).toBe('BASE')
    const withVoice = applyBrandVoiceToSystem('BASE', parseBrandVoice({ tone: 'bold' }))
    expect(withVoice.startsWith('BASE\n\n')).toBe(true)
    expect(withVoice).toContain('Tone: bold')
  })
})
