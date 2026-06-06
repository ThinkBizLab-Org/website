import { and, desc, gte, inArray, sql } from 'drizzle-orm'
import { db } from './db'
import { aiUsage, articlePageViews, articles } from './schema'

export type AiUsageKind = 'brief' | 'article' | 'fact_check' | 'image' | 'video' | 'tts'
export type AiUsageStatus = 'success' | 'failed'

export type UsageRecord = {
  kind: AiUsageKind
  model: string
  inputTokens?: number
  outputTokens?: number
  // Direct USD cost for non-token (media) usage. When set it is used verbatim;
  // otherwise cost is derived from token counts at read time.
  costUsd?: number
  status?: AiUsageStatus
  articleId?: string | null
}

// Approximate USD pricing per 1M tokens. Cost is derived from token counts at
// read time, so changing a price here re-prices history without a migration.
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 15, output: 75 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

const FALLBACK_PRICING = { input: 3, output: 15 }

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? FALLBACK_PRICING
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}

// Approximate USD pricing for media generation. Like token pricing, these are
// estimates editable without a migration (cost is stored, not recomputed, so
// changes here affect new usage only).
export const MEDIA_PRICING = {
  // per generated image
  image: 0.003,
  // per second of generated video (fal text-to-video, ~5s clips)
  videoPerSecond: 0.05,
  // ElevenLabs is ~ $0.30 per 1,000 characters on the creator tier
  ttsPerKChar: 0.3,
} as const

export function estimateImageCostUsd(count = 1): number {
  return Math.max(0, count) * MEDIA_PRICING.image
}

export function estimateVideoCostUsd(seconds: number): number {
  return Math.max(0, seconds) * MEDIA_PRICING.videoPerSecond
}

export function estimateTtsCostUsd(chars: number): number {
  return (Math.max(0, chars) / 1000) * MEDIA_PRICING.ttsPerKChar
}

// Cost for a usage row: explicit costUsd wins (media), else derive from tokens.
function rowCostUsd(row: { costUsd?: number | null; model: string; inputTokens?: number | null; outputTokens?: number | null }): number {
  if (row.costUsd != null) return row.costUsd
  return estimateCostUsd(row.model, row.inputTokens ?? 0, row.outputTokens ?? 0)
}

export type UsageRowLike = {
  kind: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
  costUsd?: number | null
  status: string
  createdAt: Date | string | null
  articleId?: string | null
}

export type UsageBucket = {
  key: string
  generations: number
  failed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export type UsageSummary = {
  totals: UsageBucket
  daily: UsageBucket[]
  monthly: UsageBucket[]
  byKind: Record<string, number>
}

function emptyBucket(key: string): UsageBucket {
  return { key, generations: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
}

function addToBucket(bucket: UsageBucket, row: UsageRowLike) {
  const input = row.inputTokens ?? 0
  const output = row.outputTokens ?? 0
  if (row.status === 'failed') bucket.failed++
  else bucket.generations++
  bucket.inputTokens += input
  bucket.outputTokens += output
  bucket.costUsd += rowCostUsd(row)
}

function dateKey(value: Date | string | null): string {
  if (!value) return 'unknown'
  const iso = value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  return iso.slice(0, 10)
}

// Aggregates usage rows into totals plus per-day and per-month buckets. Pure so
// the dashboard math is unit tested without a database.
export function summarizeUsage(rows: UsageRowLike[]): UsageSummary {
  const totals = emptyBucket('total')
  const daily = new Map<string, UsageBucket>()
  const monthly = new Map<string, UsageBucket>()
  const byKind: Record<string, number> = {}

  for (const row of rows) {
    const day = dateKey(row.createdAt)
    const month = day.slice(0, 7)

    if (!daily.has(day)) daily.set(day, emptyBucket(day))
    if (!monthly.has(month)) monthly.set(month, emptyBucket(month))

    addToBucket(totals, row)
    addToBucket(daily.get(day)!, row)
    addToBucket(monthly.get(month)!, row)
    byKind[row.kind] = (byKind[row.kind] ?? 0) + 1
  }

  const sortDesc = (a: UsageBucket, b: UsageBucket) => (a.key < b.key ? 1 : -1)
  return {
    totals,
    daily: Array.from(daily.values()).sort(sortDesc),
    monthly: Array.from(monthly.values()).sort(sortDesc),
    byKind,
  }
}

export type ArticleCostBucket = {
  articleId: string | null
  generations: number
  failed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

// Pure: groups usage rows by articleId so we can attribute spend to the content
// it produced. Rows without an articleId collect under the `null` key.
export function summarizeCostByArticle(rows: UsageRowLike[]): ArticleCostBucket[] {
  const byArticle = new Map<string | null, ArticleCostBucket>()
  for (const row of rows) {
    const key = row.articleId ?? null
    if (!byArticle.has(key)) {
      byArticle.set(key, { articleId: key, generations: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 })
    }
    const bucket = byArticle.get(key)!
    const input = row.inputTokens ?? 0
    const output = row.outputTokens ?? 0
    if (row.status === 'failed') bucket.failed++
    else bucket.generations++
    bucket.inputTokens += input
    bucket.outputTokens += output
    bucket.costUsd += rowCostUsd(row)
  }
  return Array.from(byArticle.values()).sort((a, b) => b.costUsd - a.costUsd)
}

export type ArticleCostReportRow = ArticleCostBucket & {
  title: string | null
  slug: string | null
  views: number
  costPerView: number | null
}

// Builds a per-article cost report enriched with titles and view counts (over the
// same window), so each article shows what it cost to produce vs. how it performs.
export async function getArticleCostReport(days = 60): Promise<{ articles: ArticleCostReportRow[]; unattributed: ArticleCostBucket | null }> {
  const rows = await getRecentUsage(days)
  const buckets = summarizeCostByArticle(rows)

  const attributed = buckets.filter((bucket): bucket is ArticleCostBucket & { articleId: string } => bucket.articleId !== null)
  const unattributed = buckets.find(bucket => bucket.articleId === null) ?? null
  const ids = attributed.map(bucket => bucket.articleId)
  if (ids.length === 0) return { articles: [], unattributed }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [meta, views] = await Promise.all([
    db.select({ id: articles.id, title: articles.title, slug: articles.slug }).from(articles).where(inArray(articles.id, ids)),
    db.select({ articleId: articlePageViews.articleId, views: sql<number>`count(*)::int` })
      .from(articlePageViews)
      .where(and(inArray(articlePageViews.articleId, ids), gte(articlePageViews.createdAt, since)))
      .groupBy(articlePageViews.articleId),
  ])
  const metaById = new Map(meta.map(row => [row.id, row]))
  const viewsById = new Map(views.map(row => [row.articleId, Number(row.views)]))

  const report: ArticleCostReportRow[] = attributed.map(bucket => {
    const viewCount = viewsById.get(bucket.articleId) ?? 0
    const info = metaById.get(bucket.articleId)
    return {
      ...bucket,
      title: info?.title ?? null,
      slug: info?.slug ?? null,
      views: viewCount,
      costPerView: viewCount > 0 ? bucket.costUsd / viewCount : null,
    }
  })

  return { articles: report, unattributed }
}

export async function recordAiUsage(record: UsageRecord): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      kind: record.kind,
      model: record.model,
      inputTokens: record.inputTokens ?? 0,
      outputTokens: record.outputTokens ?? 0,
      costUsd: record.costUsd ?? null,
      status: record.status ?? 'success',
      articleId: record.articleId ?? null,
    })
  } catch {
    // Usage tracking is best-effort; never block generation on a logging failure.
  }
}

// Convenience for media generation: records a direct USD cost under an
// image/video/tts kind so it counts toward the monthly budget.
export async function recordMediaUsage(record: {
  kind: 'image' | 'video' | 'tts'
  model: string
  costUsd: number
  status?: AiUsageStatus
  articleId?: string | null
}): Promise<void> {
  return recordAiUsage({
    kind: record.kind,
    model: record.model,
    costUsd: record.costUsd,
    status: record.status,
    articleId: record.articleId,
  })
}

export async function getRecentUsage(days = 60) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return db.select().from(aiUsage).where(gte(aiUsage.createdAt, since)).orderBy(desc(aiUsage.createdAt)).limit(5000)
}
