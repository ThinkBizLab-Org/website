import { describe, expect, it } from 'vitest'
import { DEFAULT_EVERGREEN, parseEvergreenConfig, pickEvergreenCandidates } from '@/lib/evergreen'

const now = new Date('2026-06-06T00:00:00.000Z')
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

const config = { enabled: true, minAgeDays: 30, cooldownDays: 30, minViews: 100, perRun: 2, platforms: ['facebook' as const] }

const article = (over: Record<string, unknown> = {}) => ({
  id: 'a', publishedAt: daysAgo(60), views: 500, evergreenLastSharedAt: null, ...over,
})

describe('parseEvergreenConfig', () => {
  it('clamps numbers and filters unknown platforms', () => {
    expect(parseEvergreenConfig('{"enabled":true,"perRun":999,"platforms":["facebook","myspace"]}')).toMatchObject({
      enabled: true, perRun: 20, platforms: ['facebook'],
    })
  })
  it('falls back to defaults on garbage', () => {
    expect(parseEvergreenConfig('xx')).toEqual(DEFAULT_EVERGREEN)
  })
})

describe('pickEvergreenCandidates', () => {
  it('selects eligible articles ranked by views, capped at perRun', () => {
    const picks = pickEvergreenCandidates([
      article({ id: 'low', views: 150 }),
      article({ id: 'high', views: 900 }),
      article({ id: 'mid', views: 400 }),
    ], config, now)
    expect(picks.map(p => p.id)).toEqual(['high', 'mid'])
  })

  it('excludes too-new, too-few-views, and in-cooldown articles', () => {
    expect(pickEvergreenCandidates([article({ publishedAt: daysAgo(10) })], config, now)).toHaveLength(0)
    expect(pickEvergreenCandidates([article({ views: 50 })], config, now)).toHaveLength(0)
    expect(pickEvergreenCandidates([article({ evergreenLastSharedAt: daysAgo(5) })], config, now)).toHaveLength(0)
    expect(pickEvergreenCandidates([article({ evergreenLastSharedAt: daysAgo(45) })], config, now)).toHaveLength(1)
  })
})
