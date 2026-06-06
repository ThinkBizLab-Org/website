import { describe, expect, it } from 'vitest'
import { captionsFromAlignment, captionsFromTimings } from '@/lib/video-pipeline'

describe('captionsFromTimings', () => {
  it('converts seconds to frames', () => {
    const caps = captionsFromTimings([{ text: 'สวัสดี', startSec: 1, endSec: 2.5 }], 30)
    expect(caps).toEqual([{ text: 'สวัสดี', fromFrame: 30, durationInFrames: 45 }])
  })
  it('drops empty segments and clamps to >=1 frame', () => {
    const caps = captionsFromTimings([{ text: '  ', startSec: 0, endSec: 1 }, { text: 'x', startSec: 0, endSec: 0 }], 30)
    expect(caps).toEqual([{ text: 'x', fromFrame: 0, durationInFrames: 1 }])
  })
})

describe('captionsFromAlignment', () => {
  it('breaks on sentence punctuation with correct timings', () => {
    const chars = ['a', 'b', '.', 'c', 'd']
    const starts = [0, 0.1, 0.2, 0.3, 0.4]
    const ends = [0.1, 0.2, 0.3, 0.4, 0.5]
    const caps = captionsFromAlignment(chars, starts, ends)
    expect(caps).toHaveLength(2)
    expect(caps[0]).toEqual({ text: 'ab.', startSec: 0, endSec: 0.3 })
    expect(caps[1]).toEqual({ text: 'cd', startSec: 0.3, endSec: 0.5 })
  })
  it('breaks on max length', () => {
    const chars = Array.from({ length: 120 }, () => 'ก')
    const starts = chars.map((_, i) => i * 0.1)
    const ends = chars.map((_, i) => i * 0.1 + 0.1)
    const caps = captionsFromAlignment(chars, starts, ends, 50)
    expect(caps.length).toBeGreaterThanOrEqual(2)
    expect(caps[0].text.length).toBeLessThanOrEqual(50)
  })
})
