import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles, settings } from '@/lib/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { logAudit, logPublishAttempt } from '@/lib/audit'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'
import { enqueueSocialJob, recordSkippedSocialJob } from '@/lib/social-queue'
import { dispatchNotification } from '@/lib/notifications'
import { pingIndexNow } from '@/lib/search-ping'

// Vercel Cron calls this every hour
// Secured by CRON_SECRET env var
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runScheduledPublish()
  } catch (error) {
    await reportOperationalEvent({
      name: 'cron.publish.failed',
      severity: 'error',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Cron publish failed' }, { status: 500 })
  }
}

async function runScheduledPublish() {
  const now = new Date()
  const results: Record<string, unknown>[] = []

  // Check if cron is enabled
  const cronSetting = await db.select().from(settings).where(eq(settings.key, 'cron_enabled'))
  if (cronSetting[0]?.value === 'false') {
    return NextResponse.json({ skipped: true, reason: 'cron disabled by admin' })
  }

  // Find approved articles scheduled for publish that haven't been published yet
  const due = await db.select().from(articles).where(
    and(
      eq(articles.status, 'approved'),
      isNotNull(articles.publishScheduledAt),
      lte(articles.publishScheduledAt, now),
    )
  )

  for (const article of due) {
    const log: Record<string, unknown> = { id: article.id, title: article.title, steps: {} }

    // 1. Publish to website
    await db.update(articles).set({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    }).where(eq(articles.id, article.id))
    log.steps = { ...log.steps as object, website: 'published' }
    await logPublishAttempt({ articleId: article.id, platform: 'website', status: 'success', mode: 'cron' })
    await logAudit({ actorEmail: 'cron', action: 'article.publish.scheduled', entityType: 'article', entityId: article.id })
    await dispatchNotification({
      event: 'published',
      message: `"${article.title}" was published to the website.`,
      context: { articleId: article.id, slug: article.slug },
    })

    // 2. LINE Broadcast
    if (article.lineBroadcastMsg && !article.lineBroadcastSent) {
      await enqueueSocialJob({ articleId: article.id, platform: 'line', payload: { message: article.lineBroadcastMsg } })
      log.steps = { ...log.steps as object, line: 'queued' }
    }

    // 3. Facebook
    if (article.fbCaption && !article.fbSent) {
      await enqueueSocialJob({ articleId: article.id, platform: 'facebook', payload: { caption: article.fbCaption, hashtags: article.fbHashtags ?? '' } })
      log.steps = { ...log.steps as object, facebook: 'queued' }
    }

    // 4. Instagram
    if (article.igCaption && !article.igSent) {
      const igImage = article.igImage || article.coverImage || ''
      await enqueueSocialJob({ articleId: article.id, platform: 'instagram', payload: { caption: article.igCaption, hashtags: article.igHashtags ?? '', imageUrl: igImage, videoUrl: article.igVideoUrl } })
      log.steps = { ...log.steps as object, instagram: 'queued' }
    }

    // 5. TikTok (only if video URL is set)
    if (article.ttCaption && article.ttVideoUrl && !article.ttSent) {
      await enqueueSocialJob({ articleId: article.id, platform: 'tiktok', payload: { caption: article.ttCaption, hashtags: article.ttHashtags ?? '', videoUrl: article.ttVideoUrl } })
      log.steps = { ...log.steps as object, tiktok: 'queued' }
    } else if (article.ttCaption && !article.ttVideoUrl) {
      await recordSkippedSocialJob(article.id, 'tiktok', { caption: article.ttCaption, hashtags: article.ttHashtags ?? '' }, 'no video URL')
      log.steps = { ...log.steps as object, tiktok: 'skipped — no video URL' }
      await logPublishAttempt({ articleId: article.id, platform: 'tiktok', status: 'skipped', mode: 'cron', error: 'no video URL' })
    }

    results.push(log)
  }

  // Notify search engines about the freshly published URLs (best-effort).
  if (due.length > 0) {
    const ping = await pingIndexNow(due.map(article => article.slug)).catch(() => null)
    if (ping?.ok) await logAudit({ actorEmail: 'cron', action: 'search.indexnow.ping', entityType: 'article', metadata: { count: ping.count } })
  }

  return NextResponse.json({ processed: results.length, results })
}
