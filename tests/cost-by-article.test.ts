import { describe, expect, it } from 'vitest'
import { summarizeCostByArticle } from '@/lib/ai-usage'

const row = (over: Record<string, unknown> = {}) => ({
  kind: 'article',
  model: 'claude-sonnet-4-6',
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  status: 'success',
  createdAt: '2026-06-01T00:00:00.000Z',
  articleId: 'a1',
  ...over,
})

describe('summarizeCostByArticle', () => {
  it('groups spend by articleId and sorts by cost desc', () => {
    const buckets = summarizeCostByArticle([
      row({ articleId: 'a1' }),
      row({ articleId: 'a1' }),
      row({ articleId: 'a2', inputTokens: 0, outputTokens: 100_000 }),
    ])
    expect(buckets[0].articleId).toBe('a1')
    // sonnet: $3/1M in + $15/1M out => $18 per row, two rows => $36
    expect(buckets[0].costUsd).toBeCloseTo(36, 5)
    expect(buckets[0].generations).toBe(2)
    expect(buckets[1].articleId).toBe('a2')
  })

  it('collects rows without an articleId under the null key', () => {
    const buckets = summarizeCostByArticle([row({ articleId: null }), row({ articleId: undefined })])
    expect(buckets).toHaveLength(1)
    expect(buckets[0].articleId).toBeNull()
    expect(buckets[0].generations).toBe(2)
  })

  it('counts failed runs separately from generations', () => {
    const buckets = summarizeCostByArticle([row({ status: 'failed' }), row()])
    expect(buckets[0].failed).toBe(1)
    expect(buckets[0].generations).toBe(1)
  })
})
