import { desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { articlePageViews, articles } from './schema'

export type PerformanceSummary = {
  totalViews: number
  viewsToday: number
  views7d: number
  views30d: number
  trackedArticles: number
  publishedArticles: number
}

export type PerformanceArticle = {
  articleId: string | null
  slug: string
  title: string | null
  category: string | null
  status: string | null
  publishedAt: Date | null
  views7d: number
  views30d: number
  totalViews: number
}

export type BreakdownRow = { label: string; value: number }
export type TrendRow = { day: string; views: number }

export type ContentPerformanceDashboard = {
  ok: true
  summary: PerformanceSummary
  trend: TrendRow[]
  articles: PerformanceArticle[]
  categories: BreakdownRow[]
  referrers: BreakdownRow[]
  recent: (typeof articlePageViews.$inferSelect)[]
}

export function referrerLabel(value: string | null) {
  if (!value) return 'Direct / unknown'
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    if (host.includes('google.')) return 'Google'
    if (host.includes('facebook.') || host.includes('fb.')) return 'Facebook'
    if (host.includes('instagram.')) return 'Instagram'
    if (host.includes('tiktok.')) return 'TikTok'
    if (host.includes('line.')) return 'LINE'
    return host
  } catch {
    return 'Other'
  }
}

export function maxValue(rows: { value?: number; views?: number }[]) {
  return Math.max(1, ...rows.map(row => Number(row.value ?? row.views ?? 0)))
}

export async function getContentPerformanceDashboard(): Promise<ContentPerformanceDashboard> {
  const [summaryRows, articleRows, categoryRows, referrerRows, trendRows, recent] = await Promise.all([
    getSummaryRows(),
    getArticleRows(),
    getCategoryRows(),
    getReferrerRows(),
    getTrendRows(),
    db.select().from(articlePageViews).orderBy(desc(articlePageViews.createdAt)).limit(60),
  ])

  const summaryRow = summaryRows[0]
  const summary = {
    totalViews: Number(summaryRow?.totalViews ?? 0),
    viewsToday: Number(summaryRow?.viewsToday ?? 0),
    views7d: Number(summaryRow?.views7d ?? 0),
    views30d: Number(summaryRow?.views30d ?? 0),
    trackedArticles: Number(summaryRow?.trackedArticles ?? 0),
    publishedArticles: Number(summaryRow?.publishedArticles ?? 0),
  }

  return {
    ok: true,
    summary,
    trend: trendRows.map(row => ({ day: row.day, views: Number(row.views) })),
    articles: articleRows.map(row => ({
      articleId: row.articleId,
      slug: row.slug,
      title: row.title,
      category: row.category,
      status: row.status,
      publishedAt: row.publishedAt,
      views7d: Number(row.views7d),
      views30d: Number(row.views30d),
      totalViews: Number(row.totalViews),
    })),
    categories: categoryRows.map(row => ({ label: row.label ?? 'Uncategorized', value: Number(row.value) })),
    referrers: referrerRows.map(row => ({ label: row.label, value: Number(row.value) })),
    recent,
  }
}

async function getSummaryRows() {
  return db.select({
    totalViews: sql<number>`count(${articlePageViews.id})::int`,
    viewsToday: sql<number>`count(*) filter (where ${articlePageViews.createdAt} >= date_trunc('day', now()))::int`,
    views7d: sql<number>`count(*) filter (where ${articlePageViews.createdAt} >= now() - interval '7 days')::int`,
    views30d: sql<number>`count(*) filter (where ${articlePageViews.createdAt} >= now() - interval '30 days')::int`,
    trackedArticles: sql<number>`count(distinct ${articlePageViews.slug})::int`,
    publishedArticles: sql<number>`(select count(*)::int from articles where status = 'published')`,
  }).from(articlePageViews)
}

async function getArticleRows() {
  return db.select({
    articleId: articlePageViews.articleId,
    slug: articlePageViews.slug,
    title: sql<string | null>`max(${articles.title})`,
    category: sql<string | null>`max(${articles.category})`,
    status: sql<string | null>`max(${articles.status})`,
    publishedAt: sql<Date | null>`max(${articles.publishedAt})`,
    views7d: sql<number>`count(*) filter (where ${articlePageViews.createdAt} >= now() - interval '7 days')::int`,
    views30d: sql<number>`count(*) filter (where ${articlePageViews.createdAt} >= now() - interval '30 days')::int`,
    totalViews: sql<number>`count(*)::int`,
  })
    .from(articlePageViews)
    .leftJoin(articles, eq(articlePageViews.articleId, articles.id))
    .groupBy(articlePageViews.articleId, articlePageViews.slug)
    .orderBy(desc(sql`count(*) filter (where ${articlePageViews.createdAt} >= now() - interval '30 days')`), desc(sql`count(*)`))
    .limit(30)
}

async function getCategoryRows() {
  return db.select({
    label: sql<string | null>`coalesce(${articles.category}, 'Uncategorized')`,
    value: sql<number>`count(${articlePageViews.id})::int`,
  })
    .from(articlePageViews)
    .leftJoin(articles, eq(articlePageViews.articleId, articles.id))
    .where(sql`${articlePageViews.createdAt} >= now() - interval '30 days'`)
    .groupBy(sql`coalesce(${articles.category}, 'Uncategorized')`)
    .orderBy(desc(sql`count(${articlePageViews.id})`))
    .limit(10)
}

async function getReferrerRows() {
  const rows = await db.select({
    referrer: articlePageViews.referrer,
    value: sql<number>`count(*)::int`,
  })
    .from(articlePageViews)
    .where(sql`${articlePageViews.createdAt} >= now() - interval '30 days'`)
    .groupBy(articlePageViews.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(60)

  const grouped = new Map<string, number>()
  for (const row of rows) {
    const label = referrerLabel(row.referrer)
    grouped.set(label, (grouped.get(label) ?? 0) + Number(row.value))
  }
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

async function getTrendRows() {
  return db.select({
    day: sql<string>`to_char(date_trunc('day', ${articlePageViews.createdAt}), 'YYYY-MM-DD')`,
    views: sql<number>`count(*)::int`,
  })
    .from(articlePageViews)
    .where(sql`${articlePageViews.createdAt} >= now() - interval '14 days'`)
    .groupBy(sql`date_trunc('day', ${articlePageViews.createdAt})`)
    .orderBy(sql`date_trunc('day', ${articlePageViews.createdAt})`)
}
