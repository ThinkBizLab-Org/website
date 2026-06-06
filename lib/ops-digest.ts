import { and, desc, eq, gte } from 'drizzle-orm'
import { db } from './db'
import { articles } from './schema'
import { getRecentUsage, summarizeUsage } from './ai-usage'
import { listDeadLetters } from './dead-letter-queue'
import { dispatchNotification } from './notifications'
import { loadVideoPipelineConfig } from './video-pipeline-config'
import { getVideoPipelineReadiness } from './video-readiness'

// A periodic operational digest pushed through the Notification Center, so the
// dashboards (publishing, AI spend, dead letters) become push instead of pull.

export type OpsDigest = {
  rangeDays: number
  published: { count: number; titles: string[] }
  ai: { generations: number; failed: number; costUsd: number }
  dlqPending: number
  video?: { enabled: boolean; ready: boolean; missing: string[] }
}

// Pure: render the digest object into a human message.
export function formatOpsDigest(digest: OpsDigest): string {
  const lines = [
    `📊 Ops digest — last ${digest.rangeDays} days`,
    '',
    `📝 Published: ${digest.published.count}`,
    ...digest.published.titles.slice(0, 5).map(title => `   • ${title}`),
    `🤖 AI: ${digest.ai.generations} generations · ${digest.ai.failed} failed · $${digest.ai.costUsd.toFixed(2)}`,
    `📮 Dead letters pending: ${digest.dlqPending}`,
  ]
  if (digest.video?.enabled && !digest.video.ready) {
    lines.push(`🎬 Video pipeline not ready — missing: ${digest.video.missing.join(', ')}`)
  }
  return lines.join('\n')
}

export async function buildOpsDigest(rangeDays = 7): Promise<OpsDigest> {
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)

  const published = await db.select({ title: articles.title })
    .from(articles)
    .where(and(eq(articles.status, 'published'), gte(articles.publishedAt, since)))
    .orderBy(desc(articles.publishedAt))
    .limit(50)

  const usageRows = await getRecentUsage(rangeDays)
  const usage = summarizeUsage(usageRows.map(row => ({
    kind: row.kind,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costUsd: row.costUsd,
    status: row.status,
    createdAt: row.createdAt,
  })))

  const pending = await listDeadLetters({ status: 'pending', limit: 500 })

  let video: OpsDigest['video']
  try {
    const cfg = await loadVideoPipelineConfig()
    if (cfg.enabled) {
      const readiness = await getVideoPipelineReadiness(cfg)
      video = { enabled: true, ready: readiness.ready, missing: readiness.missing }
    }
  } catch {
    // best-effort
  }

  return {
    rangeDays,
    published: { count: published.length, titles: published.map(row => row.title) },
    ai: { generations: usage.totals.generations, failed: usage.totals.failed, costUsd: usage.totals.costUsd },
    dlqPending: pending.length,
    video,
  }
}

export async function sendOpsDigest(rangeDays = 7) {
  const digest = await buildOpsDigest(rangeDays)
  await dispatchNotification({
    event: 'ops_digest',
    message: formatOpsDigest(digest),
    context: { rangeDays, published: digest.published.count, dlqPending: digest.dlqPending, costUsd: digest.ai.costUsd },
  })
  return digest
}
