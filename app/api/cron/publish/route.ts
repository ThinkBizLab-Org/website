import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles, settings, socialPostQueue } from '@/lib/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { logAudit, logPublishAttempt } from '@/lib/audit'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

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

    // 2. LINE Broadcast
    if (article.lineBroadcastMsg && !article.lineBroadcastSent) {
      await enqueueSocialJob(article.id, 'line', { message: article.lineBroadcastMsg })
      log.steps = { ...log.steps as object, line: 'queued' }
    }

    // 3. Facebook
    if (article.fbCaption && !article.fbSent) {
      await enqueueSocialJob(article.id, 'facebook', { caption: article.fbCaption, hashtags: article.fbHashtags ?? '' })
      log.steps = { ...log.steps as object, facebook: 'queued' }
    }

    // 4. Instagram
    if (article.igCaption && !article.igSent) {
      const igImage = article.igImage || article.coverImage || ''
      await enqueueSocialJob(article.id, 'instagram', { caption: article.igCaption, hashtags: article.igHashtags ?? '', imageUrl: igImage, videoUrl: article.igVideoUrl })
      log.steps = { ...log.steps as object, instagram: 'queued' }
    }

    // 5. TikTok (only if video URL is set)
    if (article.ttCaption && article.ttVideoUrl && !article.ttSent) {
      await enqueueSocialJob(article.id, 'tiktok', { caption: article.ttCaption, hashtags: article.ttHashtags ?? '', videoUrl: article.ttVideoUrl })
      log.steps = { ...log.steps as object, tiktok: 'queued' }
    } else if (article.ttCaption && !article.ttVideoUrl) {
      await recordSkippedSocialJob(article.id, 'tiktok', { caption: article.ttCaption, hashtags: article.ttHashtags ?? '' }, 'no video URL')
      log.steps = { ...log.steps as object, tiktok: 'skipped — no video URL' }
      await logPublishAttempt({ articleId: article.id, platform: 'tiktok', status: 'skipped', mode: 'cron', error: 'no video URL' })
    }

    results.push(log)
  }

  return NextResponse.json({ processed: results.length, results })
}

// ─── Platform helpers ─────────────────────────────────────────────────────────

async function enqueueSocialJob(articleId: string, platform: string, payload: Record<string, unknown>) {
  await db.insert(socialPostQueue).values({
    articleId,
    platform,
    status: 'queued',
    payload,
    attempts: 0,
    scheduledAt: new Date(),
    updatedAt: new Date(),
  })
}

async function recordSkippedSocialJob(articleId: string, platform: string, payload: Record<string, unknown>, error: string) {
  await db.insert(socialPostQueue).values({
    articleId,
    platform,
    status: 'failed',
    payload,
    attempts: 0,
    error,
    scheduledAt: new Date(),
    processedAt: new Date(),
    updatedAt: new Date(),
  })
}
