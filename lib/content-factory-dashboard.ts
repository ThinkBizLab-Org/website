import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from './db'
import { approvalSlaBreaches } from './approval-sla'
import { articlePageViews, articles, contentFactoryTopics, operationalEvents, publishAttempts, socialPostQueue } from './schema'
import { parseContentSeriesPlans } from './content-series-planner'
import { getSetting } from './settings-store'
import { parseTrendNewsInputs } from './trend-news-input'

export async function getContentFactoryDashboard() {
  const now = new Date()
  const inThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [topicRows, queueRows, draftRows, failedRows, eventRows, performanceRows, recentAttempts, trendNewsRaw, seriesPlansRaw, approvalSlaEnabled, approvalSlaHoursRaw] = await Promise.all([
    db.select().from(contentFactoryTopics)
      .where(lte(contentFactoryTopics.scheduledAt, inThirtyDays))
      .orderBy(contentFactoryTopics.scheduledAt)
      .limit(120),
    db.select().from(socialPostQueue).orderBy(desc(socialPostQueue.createdAt)).limit(80),
    db.select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      category: articles.category,
      publishScheduledAt: articles.publishScheduledAt,
      geoScore: articles.geoScore,
      coverImage: articles.coverImage,
      createdAt: articles.createdAt,
    }).from(articles)
      .where(and(gte(articles.createdAt, sevenDaysAgo), sql`${articles.status} in ('draft', 'review', 'approved')`))
      .orderBy(desc(articles.createdAt))
      .limit(40),
    db.select().from(contentFactoryTopics)
      .where(sql`${contentFactoryTopics.status} in ('failed', 'rejected')`)
      .orderBy(desc(contentFactoryTopics.updatedAt))
      .limit(20),
    db.select().from(operationalEvents)
      .where(sql`${operationalEvents.name} like 'content_factory.%' or ${operationalEvents.name} like 'cron.publish%'`)
      .orderBy(desc(operationalEvents.createdAt))
      .limit(20),
    db.select({
      category: articles.category,
      views: count(articlePageViews.id),
    }).from(articlePageViews)
      .leftJoin(articles, eq(articlePageViews.articleId, articles.id))
      .where(gte(articlePageViews.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
      .groupBy(articles.category)
      .orderBy(desc(count(articlePageViews.id)))
      .limit(8),
    db.select().from(publishAttempts).orderBy(desc(publishAttempts.createdAt)).limit(30),
    getSetting('content_factory_trend_news_inputs'),
    getSetting('content_factory_series_plans'),
    getSetting('content_factory_approval_sla_enabled'),
    getSetting('content_factory_approval_sla_hours'),
  ])

  const topicStats = summarize(topicRows.map(row => row.status))
  const queueStats = summarize(queueRows.map(row => row.status))
  const dueApprovals = topicRows.filter(row => ['generated', 'notified'].includes(row.status))
  const approvalSlaHours = Math.max(1, Math.min(168, Number(approvalSlaHoursRaw || '24') || 24))
  const approvalSlaBreached = approvalSlaBreaches(topicRows, approvalSlaHours)
  const overdue = topicRows.filter(row => row.scheduledAt < now && !['published', 'failed'].includes(row.status))

  return {
    ok: true,
    stats: {
      planned: topicStats.planned ?? 0,
      waitingApproval: dueApprovals.length,
      approved: topicStats.approved ?? 0,
      published: topicStats.published ?? 0,
      failed: (topicStats.failed ?? 0) + (topicStats.rejected ?? 0),
      queueQueued: queueStats.queued ?? 0,
      queueFailed: queueStats.failed ?? 0,
      overdue: overdue.length,
      approvalSlaBreached: approvalSlaBreached.length,
    },
    topics: topicRows,
    drafts: draftRows,
    queue: queueRows,
    failures: failedRows,
    notifications: eventRows,
    performance: performanceRows.map(row => ({ category: row.category ?? 'Uncategorized', views: Number(row.views) })),
    recentAttempts,
    trendNewsRaw: trendNewsRaw ?? '',
    trendNewsInputs: parseTrendNewsInputs(trendNewsRaw ?? ''),
    seriesPlansRaw: seriesPlansRaw ?? '',
    seriesPlans: parseContentSeriesPlans(seriesPlansRaw ?? ''),
    approvalSla: {
      enabled: approvalSlaEnabled !== 'false',
      hours: approvalSlaHours,
      breached: approvalSlaBreached,
    },
  }
}

function summarize(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
}
