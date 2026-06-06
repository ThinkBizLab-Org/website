import { describe, expect, it } from 'vitest'
import { MODEL_PRICING, estimateCostUsd, summarizeUsage, type UsageRowLike } from '@/lib/ai-usage'

describe('ai usage', () => {
  it('estimates cost from token counts and model pricing', () => {
    const { input, output } = MODEL_PRICING['claude-sonnet-4-6']
    expect(input).toBe(3)
    expect(output).toBe(15)
    // 1M input + 1M output at sonnet pricing = 3 + 15
    expect(estimateCostUsd('claude-sonnet-4-6', 1_000_000, 1_000_000)).toBeCloseTo(18, 6)
    // unknown model falls back to sonnet-equivalent pricing
    expect(estimateCostUsd('mystery', 1_000_000, 0)).toBeCloseTo(3, 6)
  })

  it('aggregates totals, daily, and monthly buckets with cost', () => {
    const rows: UsageRowLike[] = [
      { kind: 'article', model: 'claude-sonnet-4-6', inputTokens: 1_000_000, outputTokens: 0, status: 'success', createdAt: '2026-06-01T10:00:00.000Z' },
      { kind: 'brief', model: 'claude-sonnet-4-6', inputTokens: 0, outputTokens: 1_000_000, status: 'success', createdAt: '2026-06-01T12:00:00.000Z' },
      { kind: 'article', model: 'claude-sonnet-4-6', inputTokens: 0, outputTokens: 0, status: 'failed', createdAt: '2026-05-31T09:00:00.000Z' },
    ]
    const summary = summarizeUsage(rows)
    expect(summary.totals.generations).toBe(2)
    expect(summary.totals.failed).toBe(1)
    expect(summary.totals.costUsd).toBeCloseTo(18, 6)
    expect(summary.byKind).toEqual({ article: 2, brief: 1 })
    // daily sorted desc by date key
    expect(summary.daily[0].key).toBe('2026-06-01')
    expect(summary.daily[0].generations).toBe(2)
    expect(summary.monthly.map(m => m.key)).toEqual(['2026-06', '2026-05'])
  })

  it('handles empty input', () => {
    const summary = summarizeUsage([])
    expect(summary.totals.generations).toBe(0)
    expect(summary.daily).toEqual([])
  })
})
