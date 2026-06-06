import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, articlePageViews } from './schema'
import { getSetting, setSetting } from './settings-store'
import { enqueueSocialJob } from './social-queue'
import { logAudit } from './audit'

// Recycles top-performing evergreen articles back onto social on a cadence, so
// proven content keeps working without manual reposting. Opt-in (disabled by
// default) since it posts publicly.

export const EVERGREEN_SETTING = 'evergreen'
export const EVERGREEN_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'line'] as const
export type EvergreenPlatform = (typeof EVERGREEN_PLATFORMS)[number]

export type EvergreenConfig = {
  enabled: boolean
  minAgeDays: number
  cooldownDays: number
  minViews: number
  perRun: number
  platforms: EvergreenPlatform[]
}

export const DEFAULT_EVERGREEN: EvergreenConfig = {
  enabled: false,
  minAgeDays: 30,
  cooldownDays: 30,
  minViews: 0,
  perRun: 1,
  platforms: ['facebook'],
}

export function parseEvergreenConfig(raw: unknown): EvergreenConfig {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  }
  const num = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback
  }
  const platforms = Array.isArray(source.platforms)
    ? source.platforms.filter((p): p is EvergreenPlatform => (EVERGREEN_PLATFORMS as readonly string[]).includes(p as string))
    : DEFAULT_EVERGREEN.platforms
  return {
    enabled: source.enabled === true || source.enabled === 'true',
    minAgeDays: num(source.minAgeDays, DEFAULT_EVERGREEN.minAgeDays, 1, 3650),
    cooldownDays: num(source.cooldownDays, DEFAULT_EVERGREEN.cooldownDays, 1, 3650),
    minViews: num(source.minViews, DEFAULT_EVERGREEN.minViews, 0, 10_000_000),
    perRun: num(source.perRun, DEFAULT_EVERGREEN.perRun, 1, 20),
    platforms: Array.from(new Set(platforms)),
  }
}

export type EvergreenCandidate = {
  id: string
  publishedAt: Date | string | null
  views: number
  evergreenLastSharedAt: Date | string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

// Pure: pick eligible candidates — published long enough ago, enough views, and
// past the per-article cooldown — ranked by views, capped at perRun.
export function pickEvergreenCandidates<T extends EvergreenCandidate>(candidates: T[], config: EvergreenConfig, now: Date = new Date()): T[] {
  const minPublished = now.getTime() - config.minAgeDays * DAY_MS
  const cooldownBefore = now.getTime() - config.cooldownDays * DAY_MS
  return candidates
    .filter(c => {
      const published = c.publishedAt ? new Date(c.publishedAt).getTime() : null
      if (published === null || published > minPublished) return false
      if (c.views < config.minViews) return false
      const lastShared = c.evergreenLastSharedAt ? new Date(c.evergreenLastSharedAt).getTime() : null
      if (lastShared !== null && lastShared > cooldownBefore) return false
      return true
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, config.perRun)
}

// Builds the social payload for a platform from an article's stored captions, or
// null when the article lacks what that platform needs.
export function evergreenPayload(article: typeof articles.$inferSelect, platform: EvergreenPlatform): Record<string, unknown> | null {
  switch (platform) {
    case 'line':
      return article.lineBroadcastMsg ? { message: article.lineBroadcastMsg } : null
    case 'facebook':
      return article.fbCaption ? { caption: article.fbCaption, hashtags: article.fbHashtags ?? '' } : null
    case 'instagram':
      return article.igCaption ? { caption: article.igCaption, hashtags: article.igHashtags ?? '', imageUrl: article.igImage || article.coverImage || '', videoUrl: article.igVideoUrl } : null
    case 'tiktok':
      return article.ttCaption && article.ttVideoUrl ? { caption: article.ttCaption, hashtags: article.ttHashtags ?? '', videoUrl: article.ttVideoUrl } : null
    default:
      return null
  }
}

export async function loadEvergreenConfig(): Promise<EvergreenConfig> {
  try {
    return parseEvergreenConfig(await getSetting(EVERGREEN_SETTING))
  } catch {
    return { ...DEFAULT_EVERGREEN }
  }
}

export async function saveEvergreenConfig(config: EvergreenConfig): Promise<EvergreenConfig> {
  const normalized = parseEvergreenConfig(config)
  await setSetting(EVERGREEN_SETTING, JSON.stringify(normalized))
  return normalized
}

export type EvergreenRunResult = { ok: true; skipped?: boolean; reshared: number; reason?: string }

export async function runEvergreenReshare(now: Date = new Date()): Promise<EvergreenRunResult> {
  const config = await loadEvergreenConfig()
  if (!config.enabled) return { ok: true, skipped: true, reshared: 0, reason: 'disabled' }
  if (config.platforms.length === 0) return { ok: true, skipped: true, reshared: 0, reason: 'no platforms' }

  const minPublished = new Date(now.getTime() - config.minAgeDays * DAY_MS)
  const published = await db.select().from(articles)
    .where(and(eq(articles.status, 'published'), lte(articles.publishedAt, minPublished)))
    .orderBy(desc(articles.publishedAt))
    .limit(500)
  if (published.length === 0) return { ok: true, reshared: 0 }

  const ids = published.map(a => a.id)
  const viewRows = await db.select({ articleId: articlePageViews.articleId, views: sql<number>`count(*)::int` })
    .from(articlePageViews)
    .where(inArray(articlePageViews.articleId, ids))
    .groupBy(articlePageViews.articleId)
  const viewsById = new Map(viewRows.map(r => [r.articleId, Number(r.views)]))

  const withViews = published.map(a => ({ ...a, views: viewsById.get(a.id) ?? 0 }))
  const picks = pickEvergreenCandidates(withViews, config, now)

  let reshared = 0
  for (const article of picks) {
    let enqueuedAny = false
    for (const platform of config.platforms) {
      const payload = evergreenPayload(article, platform)
      if (!payload) continue
      await enqueueSocialJob({ articleId: article.id, platform, payload, scheduledAt: now, force: true })
      enqueuedAny = true
    }
    if (enqueuedAny) {
      await db.update(articles).set({ evergreenLastSharedAt: now, updatedAt: now }).where(eq(articles.id, article.id))
      await logAudit({ actorEmail: 'evergreen', action: 'evergreen.reshare', entityType: 'article', entityId: article.id, metadata: { views: article.views, platforms: config.platforms } })
      reshared++
    }
  }

  return { ok: true, reshared }
}
