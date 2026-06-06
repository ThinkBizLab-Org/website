import { describe, expect, it } from 'vitest'
import { mapFacebookEngagement, mapInstagramInsights } from '@/lib/platform-metrics'

describe('mapInstagramInsights', () => {
  it('maps the insights data array into metrics', () => {
    const json = {
      data: [
        { name: 'views', values: [{ value: 1200 }] },
        { name: 'likes', values: [{ value: 85 }] },
        { name: 'comments', values: [{ value: 7 }] },
        { name: 'shares', values: [{ value: 12 }] },
      ],
    }
    expect(mapInstagramInsights(json)).toEqual({ views: 1200, likes: 85, comments: 7, shares: 12 })
  })
  it('is resilient to missing/garbage shapes', () => {
    expect(mapInstagramInsights(null)).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 })
    expect(mapInstagramInsights({ data: 'nope' })).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 })
  })
})

describe('mapFacebookEngagement', () => {
  it('reads summary counts and share count', () => {
    const json = {
      likes: { summary: { total_count: 40 } },
      comments: { summary: { total_count: 5 } },
      shares: { count: 9 },
    }
    expect(mapFacebookEngagement(json)).toEqual({ views: 0, likes: 40, comments: 5, shares: 9 })
  })
  it('defaults to zeros when fields are absent', () => {
    expect(mapFacebookEngagement({})).toEqual({ views: 0, likes: 0, comments: 0, shares: 0 })
  })
})
