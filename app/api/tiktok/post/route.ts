import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getTiktokAccessToken } from '@/lib/tiktok-token'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit, logPublishAttempt } from '@/lib/audit'

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'tiktok-post', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId, mode } = await req.json() as { articleId: string; mode: 'publish' | 'reset' }

  if (mode === 'reset') {
    await db.update(articles).set({ ttSent: false, ttSentAt: null, updatedAt: new Date() }).where(eq(articles.id, articleId))
    await logPublishAttempt({ articleId, platform: 'tiktok', status: 'skipped', mode: 'reset' })
    await logAudit({ session, action: 'publish.tiktok.reset', entityType: 'article', entityId: articleId })
    return NextResponse.json({ ok: true })
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId))
  if (!article) return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 })
  if (!article.ttVideoUrl) return NextResponse.json({ error: 'ต้องมี Video URL ก่อนโพสต์ TikTok' }, { status: 400 })

  const token = await getTiktokAccessToken()
  if (!token) return NextResponse.json({ error: 'TikTok token ไม่พบหรือหมดอายุ — ไปที่ Admin Settings → TikTok' }, { status: 400 })

  const text = [article.ttCaption ?? '', article.ttHashtags ?? ''].filter(Boolean).join(' ')

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
      source_info: { source: 'PULL_FROM_URL', video_url: article.ttVideoUrl },
      post_mode: 'DIRECT_POST',
      media_type: 'VIDEO',
    }),
  })

  const data = await res.json() as { data?: { publish_id?: string }; error?: { message?: string; code?: string } }

  if (!res.ok || data.error?.code !== 'ok') {
    await logPublishAttempt({ articleId, platform: 'tiktok', status: 'failed', mode: 'manual', error: data.error?.message ?? JSON.stringify(data) })
    return NextResponse.json({ error: data.error?.message ?? JSON.stringify(data) }, { status: 400 })
  }

  await db.update(articles).set({ ttSent: true, ttSentAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, articleId))
  await logPublishAttempt({ articleId, platform: 'tiktok', status: 'success', mode: 'manual', metadata: { publishId: data.data?.publish_id } })
  await logAudit({ session, action: 'publish.tiktok', entityType: 'article', entityId: articleId, metadata: { publishId: data.data?.publish_id } })
  return NextResponse.json({ ok: true, publishId: data.data?.publish_id })
}
