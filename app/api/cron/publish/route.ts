import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles, settings } from '@/lib/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { getSetting, getSettings, setSetting } from '@/lib/settings-store'
import { logAudit, logPublishAttempt } from '@/lib/audit'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

async function getTikTokToken(): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, 'tiktok_access_token'))
  const row = rows[0]
  if (!row) return null
  const token = await getSetting('tiktok_access_token')
  if (!token) return null

  // Refresh if expiring within 2 hours
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (row.expiresAt && row.expiresAt < twoHoursFromNow) {
    const refreshToken = await getSetting('tiktok_refresh_token')
    if (!refreshToken) return null

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) return null

    const newToken = data.data?.access_token ?? data.access_token
    const expiresIn = Number(data.data?.expires_in ?? data.expires_in ?? 86400)
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await setSetting('tiktok_access_token', newToken, expiresAt)

    return newToken
  }
  return token
}

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
      const lineResult = await sendLine(article.lineBroadcastMsg)
      await db.update(articles).set({
        lineBroadcastSent: lineResult.ok,
        lineBroadcastAt: lineResult.ok ? now : undefined,
      }).where(eq(articles.id, article.id))
      log.steps = { ...log.steps as object, line: lineResult.ok ? 'sent' : `failed: ${lineResult.error}` }
      await logPublishAttempt({ articleId: article.id, platform: 'line', status: lineResult.ok ? 'success' : 'failed', mode: 'cron', error: lineResult.error })
    }

    // 3. Facebook
    if (article.fbCaption && !article.fbSent) {
      const fbResult = await postFacebook(article.fbCaption, article.fbHashtags ?? '')
      await db.update(articles).set({
        fbSent: fbResult.ok,
        fbSentAt: fbResult.ok ? now : undefined,
      }).where(eq(articles.id, article.id))
      log.steps = { ...log.steps as object, facebook: fbResult.ok ? 'sent' : `failed: ${fbResult.error}` }
      await logPublishAttempt({ articleId: article.id, platform: 'facebook', status: fbResult.ok ? 'success' : 'failed', mode: 'cron', error: fbResult.error })
    }

    // 4. Instagram
    if (article.igCaption && !article.igSent) {
      const igImage = article.igImage || article.coverImage || ''
      const igResult = await postInstagram(article.igCaption, article.igHashtags ?? '', igImage, article.igVideoUrl)
      await db.update(articles).set({
        igSent: igResult.ok,
        igSentAt: igResult.ok ? now : undefined,
      }).where(eq(articles.id, article.id))
      log.steps = { ...log.steps as object, instagram: igResult.ok ? 'sent' : `failed: ${igResult.error}` }
      await logPublishAttempt({ articleId: article.id, platform: 'instagram', status: igResult.ok ? 'success' : 'failed', mode: 'cron', error: igResult.error })
    }

    // 5. TikTok (only if video URL is set)
    if (article.ttCaption && article.ttVideoUrl && !article.ttSent) {
      const ttResult = await postTikTok(article.ttCaption, article.ttHashtags ?? '', article.ttVideoUrl)
      await db.update(articles).set({
        ttSent: ttResult.ok,
        ttSentAt: ttResult.ok ? now : undefined,
      }).where(eq(articles.id, article.id))
      log.steps = { ...log.steps as object, tiktok: ttResult.ok ? 'sent' : `failed: ${ttResult.error}` }
      await logPublishAttempt({ articleId: article.id, platform: 'tiktok', status: ttResult.ok ? 'success' : 'failed', mode: 'cron', error: ttResult.error })
    } else if (article.ttCaption && !article.ttVideoUrl) {
      log.steps = { ...log.steps as object, tiktok: 'skipped — no video URL' }
      await logPublishAttempt({ articleId: article.id, platform: 'tiktok', status: 'skipped', mode: 'cron', error: 'no video URL' })
    }

    results.push(log)
  }

  return NextResponse.json({ processed: results.length, results })
}

// ─── Platform helpers ─────────────────────────────────────────────────────────

async function sendLine(message: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: [{ type: 'text', text: message }] }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { ok: false, error: JSON.stringify(err) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function postFacebook(caption: string, hashtags: string): Promise<{ ok: boolean; error?: string }> {
  const fbMap = await getSettings(['fb_page_access_token', 'fb_page_id'])
  const token = fbMap['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN
  const pageId = fbMap['fb_page_id'] || process.env.FB_PAGE_ID
  if (!token || !pageId) return { ok: false, error: 'FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set' }
  try {
    const message = hashtags ? `${caption}\n\n${hashtags}` : caption
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: token }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { ok: false, error: JSON.stringify(err) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function postInstagram(caption: string, hashtags: string, imageUrl: string, videoUrl?: string | null): Promise<{ ok: boolean; error?: string }> {
  const igMap = await getSettings(['fb_page_access_token', 'ig_user_id'])
  const token = igMap['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN
  const igUserId = igMap['ig_user_id'] || process.env.IG_USER_ID
  if (!token || !igUserId) return { ok: false, error: 'FB_PAGE_ACCESS_TOKEN or IG_USER_ID not set' }

  const text = hashtags ? `${caption}\n\n${hashtags}` : caption

  try {
    // Reel if video URL is provided
    if (videoUrl) {
      const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption: text, share_to_feed: true, access_token: token }),
      })
      if (!createRes.ok) { const err = await createRes.json(); return { ok: false, error: JSON.stringify(err) } }
      const { id: creationId } = await createRes.json()
      // Wait up to 90s for processing
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${token}`)
        const statusData = await statusRes.json() as { status_code?: string }
        if (statusData.status_code === 'FINISHED') break
        if (statusData.status_code === 'ERROR' || statusData.status_code === 'EXPIRED') return { ok: false, error: `Reel processing failed: ${statusData.status_code}` }
      }
      const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: token }),
      })
      if (!publishRes.ok) { const err = await publishRes.json(); return { ok: false, error: JSON.stringify(err) } }
      return { ok: true }
    }

    // Photo post
    if (!imageUrl) return { ok: false, error: 'Instagram requires a cover image or video' }
    const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: token }),
    })
    if (!createRes.ok) { const err = await createRes.json(); return { ok: false, error: JSON.stringify(err) } }
    const { id: creationId } = await createRes.json()
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) { const err = await publishRes.json(); return { ok: false, error: JSON.stringify(err) } }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function postTikTok(caption: string, hashtags: string, videoUrl: string): Promise<{ ok: boolean; error?: string }> {
  const token = await getTikTokToken()
  if (!token) return { ok: false, error: 'TikTok token not found or refresh failed' }
  try {
    const text = hashtags ? `${caption} ${hashtags}` : caption
    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        post_info: {
          title: text.slice(0, 2200),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
        post_mode: 'DIRECT_POST',
        media_type: 'VIDEO',
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { ok: false, error: JSON.stringify(err) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
