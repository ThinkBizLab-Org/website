import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getSettings } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit, logPublishAttempt } from '@/lib/audit'

async function getFbCredentials(): Promise<{ token: string; pageId: string }> {
  const map = await getSettings(['fb_page_access_token', 'fb_page_id'])
  const token = map['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN || ''
  const pageId = map['fb_page_id'] || process.env.FB_PAGE_ID || ''
  return { token, pageId }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'facebook-post', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId, mode } = await req.json() as { articleId: string; mode: 'test' | 'publish' | 'reset' }

  // Reset fbSent flag
  if (mode === 'reset') {
    await db.update(articles).set({ fbSent: false, fbSentAt: null, updatedAt: new Date() }).where(eq(articles.id, articleId))
    await logPublishAttempt({ articleId, platform: 'facebook', status: 'skipped', mode: 'reset' })
    await logAudit({ session, action: 'publish.facebook.reset', entityType: 'article', entityId: articleId })
    return NextResponse.json({ ok: true })
  }

  const { token, pageId } = await getFbCredentials()
  if (!token || !pageId) {
    return NextResponse.json({
      error: 'ยังไม่ได้ตั้งค่า FB Page Access Token หรือ Page ID — ไปที่ Admin Settings → Facebook'
    }, { status: 400 })
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId))
  if (!article) return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 })

  // Build message
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thinkbizlab.com').trim()
  // Use /a/[id] — ASCII-only URL that Facebook's bot can scrape for OG tags
  // Users are immediately redirected to the actual article page
  const articleUrl = `${base}/a/${articleId}`

  let message = (article.fbCaption ?? '').trim()
  if (article.fbHashtags?.trim()) message += `\n\n${article.fbHashtags.trim()}`

  // Test mode = verify credentials only (no post)
  if (mode === 'test') {
    const verifyRes = await fetch(
      `https://graph.facebook.com/v20.0/${pageId}?fields=name,id&access_token=${token}`
    )
    const verifyData = await verifyRes.json() as { name?: string; id?: string; error?: { message?: string } }
    if (!verifyRes.ok || verifyData.error) {
      await logPublishAttempt({ articleId, platform: 'facebook', status: 'failed', mode: 'test', error: verifyData.error?.message })
      return NextResponse.json({ error: verifyData.error?.message ?? 'ตรวจสอบ Token ไม่สำเร็จ' }, { status: 400 })
    }
    await logPublishAttempt({ articleId, platform: 'facebook', status: 'success', mode: 'test', metadata: { pageName: verifyData.name } })
    return NextResponse.json({ ok: true, pageName: verifyData.name })
  }

  // Publish mode — link post: Facebook scrapes og:image, og:title, og:description
  // from the article URL and shows a clickable preview card (best UX)
  // Pre-scrape the URL so Facebook fetches the latest OG image/title/description
  if (articleUrl) {
    await fetch(`https://graph.facebook.com/?id=${encodeURIComponent(articleUrl)}&scrape=true&access_token=${token}`, {
      method: 'POST',
    }).catch(() => { /* ignore scrape errors */ })
  }

  const payload: Record<string, unknown> = { access_token: token, message }
  if (articleUrl) payload.link = articleUrl

  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json() as { id?: string; post_id?: string; error?: { message?: string; code?: number } }

  if (!res.ok) {
    await logPublishAttempt({ articleId, platform: 'facebook', status: 'failed', mode: 'manual', error: data.error?.message ?? JSON.stringify(data) })
    return NextResponse.json({ error: data.error?.message ?? JSON.stringify(data) }, { status: 400 })
  }

  await db.update(articles).set({
    fbSent: true,
    fbSentAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(articles.id, articleId))

  await logPublishAttempt({ articleId, platform: 'facebook', status: 'success', mode: 'manual', metadata: { postId: data.id } })
  await logAudit({ session, action: 'publish.facebook', entityType: 'article', entityId: articleId, metadata: { postId: data.id } })

  return NextResponse.json({
    ok: true,
    postId: data.id,
    url: data.id ? `https://www.facebook.com/${data.id.replace('_', '/posts/')}` : null,
  })
}
