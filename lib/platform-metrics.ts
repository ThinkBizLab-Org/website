import { and, eq, gte, isNotNull, lt, or, isNull, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, socialPostMetrics } from './schema'
import { getSettings } from './settings-store'

// Pulls per-post engagement (views/likes/comments/shares) from the social
// platforms and stores snapshots, so real performance — not a page-view proxy —
// can feed format learning and dashboards. All fetches are best-effort and no-op
// without credentials.

export type PostMetrics = { views: number; likes: number; comments: number; shares: number }

const ZERO: PostMetrics = { views: 0, likes: 0, comments: 0, shares: 0 }

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Pure: Instagram media insights → metrics. Shape: { data: [{ name, values:[{value}] }] }.
export function mapInstagramInsights(json: unknown): PostMetrics {
  const data = (json as { data?: { name?: string; values?: { value?: unknown }[] }[] })?.data
  if (!Array.isArray(data)) return { ...ZERO }
  const out: PostMetrics = { ...ZERO }
  for (const row of data) {
    const value = num(row.values?.[0]?.value)
    switch (row.name) {
      case 'views':
      case 'plays':
      case 'reach':
      case 'impressions': out.views = Math.max(out.views, value); break
      case 'likes': out.likes = value; break
      case 'comments': out.comments = value; break
      case 'shares': out.shares = value; break
    }
  }
  return out
}

// Pure: Facebook post engagement fields → metrics. Shape:
// { likes:{summary:{total_count}}, comments:{summary:{total_count}}, shares:{count} }.
export function mapFacebookEngagement(json: unknown): PostMetrics {
  const j = json as {
    likes?: { summary?: { total_count?: unknown } }
    comments?: { summary?: { total_count?: unknown } }
    shares?: { count?: unknown }
  }
  return {
    views: 0,
    likes: num(j?.likes?.summary?.total_count),
    comments: num(j?.comments?.summary?.total_count),
    shares: num(j?.shares?.count),
  }
}

async function fetchInstagram(postId: string, token: string): Promise<PostMetrics | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${postId}/insights?metric=views,likes,comments,shares&access_token=${token}`)
    if (!res.ok) return null
    return mapInstagramInsights(await res.json())
  } catch {
    return null
  }
}

async function fetchFacebook(postId: string, token: string): Promise<PostMetrics | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${token}`)
    if (!res.ok) return null
    return mapFacebookEngagement(await res.json())
  } catch {
    return null
  }
}

// IO: refresh metrics for posts that have an id and are due for a refresh.
export async function ingestPlatformMetrics(now: Date = new Date(), maxAgeHours = 6, limit = 200): Promise<{ updated: number; checked: number }> {
  const dueBefore = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000)
  const rows = await db.select().from(socialPostMetrics)
    .where(and(
      isNotNull(socialPostMetrics.postId),
      or(isNull(socialPostMetrics.fetchedAt), lt(socialPostMetrics.fetchedAt, dueBefore)),
    ))
    .limit(limit)
  if (rows.length === 0) return { updated: 0, checked: 0 }

  const creds = await getSettings(['fb_page_access_token'])
  const token = creds['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN || ''

  let updated = 0
  for (const row of rows) {
    if (!row.postId) continue
    let metrics: PostMetrics | null = null
    if (row.platform === 'instagram' && token) metrics = await fetchInstagram(row.postId, token)
    else if (row.platform === 'facebook' && token) metrics = await fetchFacebook(row.postId, token)
    // tiktok insights require an additional scope/endpoint — skipped for now.
    if (!metrics) continue
    await db.update(socialPostMetrics)
      .set({ ...metrics, fetchedAt: now })
      .where(eq(socialPostMetrics.id, row.id))
    updated++
  }
  return { updated, checked: rows.length }
}

// Real per-article performance rows for format learning: total platform views
// per article (summed across platforms) over the window, tagged with the video
// format that was rendered. Empty when no metrics have been collected yet.
export async function getMetricViewRowsByFormat(days = 90): Promise<{ format: string | null; score: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      format: articles.videoFormatUsed,
      score: sql<number>`coalesce(sum(${socialPostMetrics.views}),0)::int`,
    })
    .from(socialPostMetrics)
    .innerJoin(articles, eq(articles.id, socialPostMetrics.articleId))
    .where(and(isNotNull(articles.videoFormatUsed), gte(socialPostMetrics.createdAt, since)))
    .groupBy(articles.id, articles.videoFormatUsed)
  return rows.map(r => ({ format: r.format, score: Number(r.score) }))
}
