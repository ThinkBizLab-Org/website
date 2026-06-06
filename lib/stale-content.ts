import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, articlePageViews } from './schema'
import { getSetting, setSetting } from './settings-store'
import { runAndStoreFactCheck } from './fact-check'
import { dispatchNotification } from './notifications'
import { logAudit } from './audit'

// Finds published articles that have gone stale — old and no longer drawing
// views — and runs a non-destructive refresh pass (re-fact-checks them and flags
// them for a human to update). It never rewrites content automatically.

export const STALE_CONTENT_SETTING = 'stale_content'

export type StaleContentConfig = {
  enabled: boolean
  staleAfterDays: number
  recentWindowDays: number
  maxRecentViews: number
  perRun: number
}

export const DEFAULT_STALE_CONTENT: StaleContentConfig = {
  enabled: false,
  staleAfterDays: 180,
  recentWindowDays: 30,
  maxRecentViews: 5,
  perRun: 5,
}

export function parseStaleContentConfig(raw: unknown): StaleContentConfig {
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
  return {
    enabled: source.enabled === true || source.enabled === 'true',
    staleAfterDays: num(source.staleAfterDays, DEFAULT_STALE_CONTENT.staleAfterDays, 7, 3650),
    recentWindowDays: num(source.recentWindowDays, DEFAULT_STALE_CONTENT.recentWindowDays, 1, 365),
    maxRecentViews: num(source.maxRecentViews, DEFAULT_STALE_CONTENT.maxRecentViews, 0, 10_000_000),
    perRun: num(source.perRun, DEFAULT_STALE_CONTENT.perRun, 1, 50),
  }
}

export type StaleCandidate = {
  id: string
  publishedAt: Date | string | null
  recentViews: number
  lastRefreshedAt: Date | string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

// Pure: an article is stale when it was published before the cutoff, has few
// recent views, and has not been refreshed within the stale window. Oldest first.
export function pickStaleArticles<T extends StaleCandidate>(candidates: T[], config: StaleContentConfig, now: Date = new Date()): T[] {
  const publishedBefore = now.getTime() - config.staleAfterDays * DAY_MS
  const refreshedBefore = now.getTime() - config.staleAfterDays * DAY_MS
  return candidates
    .filter(c => {
      const published = c.publishedAt ? new Date(c.publishedAt).getTime() : null
      if (published === null || published > publishedBefore) return false
      if (c.recentViews > config.maxRecentViews) return false
      const refreshed = c.lastRefreshedAt ? new Date(c.lastRefreshedAt).getTime() : null
      if (refreshed !== null && refreshed > refreshedBefore) return false
      return true
    })
    .sort((a, b) => {
      const pa = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const pb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return pa - pb
    })
    .slice(0, config.perRun)
}

export async function loadStaleContentConfig(): Promise<StaleContentConfig> {
  try {
    return parseStaleContentConfig(await getSetting(STALE_CONTENT_SETTING))
  } catch {
    return { ...DEFAULT_STALE_CONTENT }
  }
}

export async function saveStaleContentConfig(config: StaleContentConfig): Promise<StaleContentConfig> {
  const normalized = parseStaleContentConfig(config)
  await setSetting(STALE_CONTENT_SETTING, JSON.stringify(normalized))
  return normalized
}

export type StaleArticle = { id: string; title: string; slug: string; publishedAt: Date | null; recentViews: number; lastRefreshedAt: Date | null }

export async function findStaleArticles(config: StaleContentConfig, now: Date = new Date()): Promise<StaleArticle[]> {
  const publishedBefore = new Date(now.getTime() - config.staleAfterDays * DAY_MS)
  const recentSince = new Date(now.getTime() - config.recentWindowDays * DAY_MS)

  const published = await db.select({ id: articles.id, title: articles.title, slug: articles.slug, publishedAt: articles.publishedAt, lastRefreshedAt: articles.lastRefreshedAt })
    .from(articles)
    .where(and(eq(articles.status, 'published'), lte(articles.publishedAt, publishedBefore)))
    .limit(1000)
  if (published.length === 0) return []

  const ids = published.map(a => a.id)
  const viewRows = await db.select({ articleId: articlePageViews.articleId, views: sql<number>`count(*)::int` })
    .from(articlePageViews)
    .where(and(inArray(articlePageViews.articleId, ids), sql`${articlePageViews.createdAt} >= ${recentSince}`))
    .groupBy(articlePageViews.articleId)
  const viewsById = new Map(viewRows.map(r => [r.articleId, Number(r.views)]))

  const withViews = published.map(a => ({ ...a, recentViews: viewsById.get(a.id) ?? 0 }))
  return pickStaleArticles(withViews, config, now).map(a => ({
    id: a.id, title: a.title, slug: a.slug, publishedAt: a.publishedAt, recentViews: a.recentViews, lastRefreshedAt: a.lastRefreshedAt,
  }))
}

export type StaleRunResult = { ok: true; skipped?: boolean; refreshed: number; reason?: string; articles?: { id: string; title: string }[] }

export async function runStaleRefresh(now: Date = new Date()): Promise<StaleRunResult> {
  const config = await loadStaleContentConfig()
  if (!config.enabled) return { ok: true, skipped: true, refreshed: 0, reason: 'disabled' }

  const stale = await findStaleArticles(config, now)
  if (stale.length === 0) return { ok: true, refreshed: 0, articles: [] }

  for (const article of stale) {
    const [full] = await db.select().from(articles).where(eq(articles.id, article.id)).limit(1)
    if (full) await runAndStoreFactCheck(full)
    await db.update(articles).set({ lastRefreshedAt: now, updatedAt: now }).where(eq(articles.id, article.id))
    await logAudit({ actorEmail: 'stale-content', action: 'stale_content.refresh', entityType: 'article', entityId: article.id, metadata: { recentViews: article.recentViews } })
  }

  await dispatchNotification({
    event: 'stale_content',
    message: `${stale.length} stale article(s) flagged for refresh:\n${stale.map(a => `• ${a.title} (${a.recentViews} recent views)`).join('\n')}`,
    context: { count: stale.length, ids: stale.map(a => a.id) },
  })

  return { ok: true, refreshed: stale.length, articles: stale.map(a => ({ id: a.id, title: a.title })) }
}
