import { describe, expect, it, vi } from 'vitest'
import { estimateReadTime, generateSlug } from '@/lib/markdown'

describe('markdown helpers', () => {
  it('generates Thai/English slugs safely', () => {
    expect(generateSlug('กลยุทธ์ SME 2026: Growth!')).toBe('กลยุทธ์-sme-2026-growth')
  })

  it('falls back when title contains no slug-safe characters', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    expect(generateSlug('!!!')).toBe('article-1767225600000')
    vi.useRealTimers()
  })

  it('estimates at least one minute read time', () => {
    expect(estimateReadTime('short text')).toBe(1)
    expect(estimateReadTime(Array.from({ length: 420 }, (_, i) => `w${i}`).join(' '))).toBe(2)
  })
})
