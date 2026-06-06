import { describe, expect, it } from 'vitest'
import {
  learnedFormatWeights,
  pickWeightedFormat,
  summarizeFormatStats,
} from '@/lib/video-format-learning'

describe('summarizeFormatStats', () => {
  it('averages score per format and ignores null formats', () => {
    const stats = summarizeFormatStats([
      { format: 'hybrid', score: 10 },
      { format: 'hybrid', score: 20 },
      { format: 'cinematic', score: 6 },
      { format: null, score: 99 },
    ])
    const hybrid = stats.find(s => s.format === 'hybrid')!
    expect(hybrid).toEqual({ format: 'hybrid', count: 2, avgScore: 15 })
    expect(stats.find(s => s.format === 'cinematic')!.avgScore).toBe(6)
    expect(stats.some(s => s.format === null)).toBe(false)
  })
})

describe('learnedFormatWeights', () => {
  it('keeps an exploration floor for every format and sums to ~1', () => {
    const w = learnedFormatWeights([{ format: 'hybrid', count: 10, avgScore: 100 }], { epsilon: 0.3, minSamples: 3 })
    const formats = Object.keys(w)
    expect(formats).toEqual(['motion_graphics', 'hybrid', 'cinematic'])
    // floor = 0.3/3 = 0.1 — even unproven formats keep being explored
    expect(w.motion_graphics).toBeCloseTo(0.1)
    expect(w.cinematic).toBeCloseTo(0.1)
    // hybrid is the only one with enough samples → gets all exploitation mass
    expect(w.hybrid).toBeCloseTo(0.1 + 0.7)
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('falls back to uniform when no format has enough samples', () => {
    const w = learnedFormatWeights([{ format: 'hybrid', count: 1, avgScore: 100 }], { minSamples: 3 })
    expect(w.motion_graphics).toBeCloseTo(w.hybrid)
    expect(w.hybrid).toBeCloseTo(w.cinematic)
  })
})

describe('pickWeightedFormat', () => {
  it('selects deterministically by cumulative weight', () => {
    const weights = { motion_graphics: 0.1, hybrid: 0.8, cinematic: 0.1 }
    expect(pickWeightedFormat(weights, 0.05)).toBe('motion_graphics')
    expect(pickWeightedFormat(weights, 0.5)).toBe('hybrid')
    expect(pickWeightedFormat(weights, 0.95)).toBe('cinematic')
  })
  it('returns null for empty weights', () => {
    expect(pickWeightedFormat({}, 0.5)).toBeNull()
  })
})
