import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getTiktokAccessToken } from '@/lib/tiktok-token'
import { publishTiktokVideo } from '@/lib/tiktok-post'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit, logPublishAttempt } from '@/lib/audit'

type PostBody = {
  articleId: string
  mode: 'publish' | 'reset'
  privacyLevel?: string
  disableComment?: boolean
  disableDuet?: boolean
  disableStitch?: boolean
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'tiktok-post', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId, mode, privacyLevel, disableComment, disableDuet, disableStitch } = await req.json() as PostBody

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

  const result = await publishTiktokVideo(token, article.ttVideoUrl, text, {
    privacyLevel,
    disableComment,
    disableDuet,
    disableStitch,
  })

  if (!result.ok) {
    await logPublishAttempt({ articleId, platform: 'tiktok', status: 'failed', mode: 'manual', error: result.error })
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  await db.update(articles).set({ ttSent: true, ttSentAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, articleId))
  await logPublishAttempt({ articleId, platform: 'tiktok', status: 'success', mode: 'manual', metadata: { publishId: result.publishId } })
  await logAudit({ session, action: 'publish.tiktok', entityType: 'article', entityId: articleId, metadata: { publishId: result.publishId } })
  return NextResponse.json({ ok: true, publishId: result.publishId })
}
