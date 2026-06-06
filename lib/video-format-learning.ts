import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, articlePageViews } from './schema'
import type { VideoFormat } from './video-plan'
import { getMetricViewRowsByFormat } from './platform-metrics'

// Gradual, self-improving format selection. The router's fallback format is
// chosen with an epsilon-greedy policy: every format keeps a floor probability
// (exploration — so the system never stops trying alternatives), and the rest of
// the probability mass is split by measured performance (exploitation). As more
// videos accumulate performance data, the weights shift toward what works —
// without ever hard-locking onto one format.

export const LEARNABLE_FORMATS: VideoFormat[] = ['motion_graphics', 'hybrid', 'cinematic']

export type FormatStat = { format: string; count: number; avgScore: number }

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

// Pure: average a per-video performance score by format.
export function summarizeFormatStats(rows: { format: string | null; score: number }[]): FormatStat[] {
  const map = new Map<string, { count: number; total: number }>()
  for (const r of rows) {
    if (!r.format) continue
    const cur = map.get(r.format) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Number.isFinite(r.score) ? r.score : 0
    map.set(r.format, cur)
  }
  return Array.from(map.entries()).map(([format, v]) => ({ format, count: v.count, avgScore: v.count ? v.total / v.count : 0 }))
}

// Pure: epsilon-greedy weights over candidate formats. Formats with fewer than
// `minSamples` data points are not yet trusted for exploitation (they still get
// the exploration floor, so they keep being tried).
export function learnedFormatWeights(
  stats: FormatStat[],
  opts: { formats?: VideoFormat[]; epsilon?: number; minSamples?: number } = {},
): Record<string, number> {
  const formats = opts.formats ?? LEARNABLE_FORMATS
  if (formats.length === 0) return {}
  const epsilon = clamp01(opts.epsilon ?? 0.3)
  const minSamples = Math.max(0, opts.minSamples ?? 3)

  const byFormat = new Map(stats.map(s => [s.format, s]))
  const floor = epsilon / formats.length

  const scores = formats.map(f => {
    const s = byFormat.get(f)
    return s && s.count >= minSamples ? Math.max(0, s.avgScore) : 0
  })
  const totalScore = scores.reduce((a, b) => a + b, 0)

  const weights: Record<string, number> = {}
  formats.forEach((f, i) => {
    const exploit = totalScore > 0
      ? (1 - epsilon) * (scores[i] / totalScore)
      : (1 - epsilon) / formats.length
    weights[f] = floor + exploit
  })
  return weights
}

// Pure: pick a format from weights using rng in [0,1). Deterministic for tests.
export function pickWeightedFormat(weights: Record<string, number>, rng: number = Math.random()): VideoFormat | null {
  const entries = Object.entries(weights)
  const total = entries.reduce((a, [, w]) => a + w, 0)
  if (total <= 0) return null
  let r = clamp01(rng) * total
  for (const [format, w] of entries) {
    r -= w
    if (r <= 0) return format as VideoFormat
  }
  return entries[entries.length - 1][0] as VideoFormat
}

// Proxy performance rows: article page views (over the window) per article whose
// video used a format. Used only until real platform metrics are available.
export async function getProxyViewRows(days = 90): Promise<{ format: string | null; score: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({
      format: articles.videoFormatUsed,
      score: sql<number>`count(${articlePageViews.articleId})::int`,
    })
    .from(articles)
    .leftJoin(articlePageViews, and(eq(articlePageViews.articleId, articles.id), gte(articlePageViews.createdAt, since)))
    .where(isNotNull(articles.videoFormatUsed))
    .groupBy(articles.id, articles.videoFormatUsed)
  return rows.map(r => ({ format: r.format, score: Number(r.score) }))
}

export async function getFormatPerformance(days = 90): Promise<FormatStat[]> {
  return summarizeFormatStats(await getProxyViewRows(days))
}

// Prefer real platform views; fall back to the page-view proxy until metrics
// have been collected. This closes the loop once analytics ingestion runs.
export async function getLearnedFormatWeights(days = 90): Promise<Record<string, number>> {
  try {
    let rows = await getMetricViewRowsByFormat(days).catch(() => [])
    if (!rows.length) rows = await getProxyViewRows(days).catch(() => [])
    return learnedFormatWeights(summarizeFormatStats(rows))
  } catch {
    return {}
  }
}
