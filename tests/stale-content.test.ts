import { describe, expect, it } from 'vitest'
import { DEFAULT_STALE_CONTENT, parseStaleContentConfig, pickStaleArticles } from '@/lib/stale-content'

const now = new Date('2026-06-06T00:00:00.000Z')
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

const config = { enabled: true, staleAfterDays: 180, recentWindowDays: 30, maxRecentViews: 5, perRun: 3 }

const article = (over: Record<string, unknown> = {}) => ({
  id: 'a', publishedAt: daysAgo(365), recentViews: 0, lastRefreshedAt: null, ...over,
})

describe('parseStaleContentConfig', () => {
  it('clamps and falls back', () => {
    expect(parseStaleContentConfig('{"enabled":true,"staleAfterDays":1,"perRun":999}')).toMatchObject({
      enabled: true, staleAfterDays: 7, perRun: 50,
    })
    expect(parseStaleContentConfig('garbage')).toEqual(DEFAULT_STALE_CONTENT)
  })
})

describe('pickStaleArticles', () => {
  it('flags old, low-view, un-refreshed articles, oldest first', () => {
    const picks = pickStaleArticles([
      article({ id: 'newer', publishedAt: daysAgo(200) }),
      article({ id: 'oldest', publishedAt: daysAgo(700) }),
    ], config, now)
    expect(picks.map(p => p.id)).toEqual(['oldest', 'newer'])
  })

  it('excludes recent, popular, or recently-refreshed articles', () => {
    expect(pickStaleArticles([article({ publishedAt: daysAgo(30) })], config, now)).toHaveLength(0)
    expect(pickStaleArticles([article({ recentViews: 50 })], config, now)).toHaveLength(0)
    expect(pickStaleArticles([article({ lastRefreshedAt: daysAgo(10) })], config, now)).toHaveLength(0)
    expect(pickStaleArticles([article({ lastRefreshedAt: daysAgo(365) })], config, now)).toHaveLength(1)
  })

  it('caps at perRun', () => {
    const many = Array.from({ length: 10 }, (_, i) => article({ id: `a${i}`, publishedAt: daysAgo(200 + i) }))
    expect(pickStaleArticles(many, config, now)).toHaveLength(3)
  })
})
