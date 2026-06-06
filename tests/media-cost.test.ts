import { describe, expect, it } from 'vitest'
import {
  MEDIA_PRICING,
  estimateImageCostUsd,
  estimateTtsCostUsd,
  estimateVideoCostUsd,
  summarizeUsage,
} from '@/lib/ai-usage'

describe('media cost estimates', () => {
  it('prices images, video seconds, and TTS characters', () => {
    expect(estimateImageCostUsd(2)).toBeCloseTo(MEDIA_PRICING.image * 2)
    expect(estimateVideoCostUsd(5)).toBeCloseTo(MEDIA_PRICING.videoPerSecond * 5)
    expect(estimateTtsCostUsd(2000)).toBeCloseTo(MEDIA_PRICING.ttsPerKChar * 2)
    expect(estimateImageCostUsd(-1)).toBe(0)
  })
})

describe('summarizeUsage honours explicit costUsd for media rows', () => {
  it('uses costUsd when present, token math otherwise', () => {
    const summary = summarizeUsage([
      { kind: 'video', model: 'fal-broll', inputTokens: 0, outputTokens: 0, costUsd: 0.25, status: 'success', createdAt: '2026-06-06T00:00:00Z' },
      { kind: 'article', model: 'claude-sonnet-4-6', inputTokens: 1_000_000, outputTokens: 0, status: 'success', createdAt: '2026-06-06T00:00:00Z' },
    ])
    // 0.25 (explicit media) + 3.0 (1M sonnet input tokens @ $3/M)
    expect(summary.totals.costUsd).toBeCloseTo(3.25)
    expect(summary.byKind.video).toBe(1)
    expect(summary.byKind.article).toBe(1)
  })
})
