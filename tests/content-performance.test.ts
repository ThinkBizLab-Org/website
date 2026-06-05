import { describe, expect, it } from 'vitest'
import { maxValue, referrerLabel } from '@/lib/content-performance'

describe('content performance helpers', () => {
  it('normalizes common referrer sources', () => {
    expect(referrerLabel(null)).toBe('Direct / unknown')
    expect(referrerLabel('https://www.google.com/search?q=thinkbiz')).toBe('Google')
    expect(referrerLabel('https://facebook.com/story')).toBe('Facebook')
    expect(referrerLabel('https://l.instagram.com/')).toBe('Instagram')
    expect(referrerLabel('https://www.tiktok.com/@thinkbiz')).toBe('TikTok')
    expect(referrerLabel('https://line.me/R/msg/text')).toBe('LINE')
    expect(referrerLabel('not-a-url')).toBe('Other')
  })

  it('keeps chart max safe for empty rows', () => {
    expect(maxValue([])).toBe(1)
    expect(maxValue([{ value: 3 }, { value: 9 }])).toBe(9)
    expect(maxValue([{ views: 4 }, { views: 2 }])).toBe(4)
  })
})
