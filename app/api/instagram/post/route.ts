import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getSettings } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit, logPublishAttempt } from '@/lib/audit'

async function getIgCredentials(): Promise<{ token: string; igUserId: string }> {
  const map = await getSettings(['fb_page_access_token', 'ig_user_id'])
  const token = map['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN || ''
  const igUserId = map['ig_user_id'] || process.env.IG_USER_ID || ''
  return { token, igUserId }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function waitForContainer(containerId: string, token: string, maxWaitMs = 60000): Promise<{ ok: boolean; error?: string }> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${token}`
    )
    const data = await res.json() as { status_code?: string; status?: string; error?: { message?: string } }
    if (data.error) return { ok: false, error: data.error.message }
    if (data.status_code === 'FINISHED') return { ok: true }
    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      return { ok: false, error: `Container status: ${data.status_code}` }
    }
    await sleep(3000)
  }
  return { ok: false, error: 'Timeout waiting for video to process' }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin()
  if (response) return response

  const limited = rateLimit(req, { key: 'instagram-post', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId, mode } = await req.json() as { articleId: string; mode: 'test' | 'photo' | 'reel' | 'reset' }

  // Reset igSent flag
  if (mode === 'reset') {
    await db.update(articles).set({ igSent: false, igSentAt: null, updatedAt: new Date() }).where(eq(articles.id, articleId))
    await logPublishAttempt({ articleId, platform: 'instagram', status: 'skipped', mode: 'reset' })
    await logAudit({ session, action: 'publish.instagram.reset', entityType: 'article', entityId: articleId })
    return NextResponse.json({ ok: true })
  }

  const { token, igUserId } = await getIgCredentials()
  if (!token || !igUserId) {
    return NextResponse.json({
      error: 'ยังไม่ได้ตั้งค่า IG User ID หรือ FB Page Access Token — ไปที่ Admin Settings → Instagram'
    }, { status: 400 })
  }

  // Test mode — verify credentials
  if (mode === 'test') {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${igUserId}?fields=name,username&access_token=${token}`
    )
    const data = await res.json() as { name?: string; username?: string; error?: { message?: string } }
    if (!res.ok || data.error) {
      await logPublishAttempt({ articleId, platform: 'instagram', status: 'failed', mode: 'test', error: data.error?.message })
      return NextResponse.json({ error: data.error?.message ?? 'ตรวจสอบ IG credentials ไม่สำเร็จ' }, { status: 400 })
    }
    await logPublishAttempt({ articleId, platform: 'instagram', status: 'success', mode: 'test', metadata: { username: data.username } })
    return NextResponse.json({ ok: true, username: data.username, name: data.name })
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId))
  if (!article) return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 })

  const caption = [article.igCaption ?? '', article.igHashtags ?? ''].filter(Boolean).join('\n\n')

  // Photo post
  if (mode === 'photo') {
    const imageUrl = article.igImage || article.coverImage
    if (!imageUrl) {
      return NextResponse.json({ error: 'ต้องมี IG Image หรือ Cover Image ก่อนโพสต์' }, { status: 400 })
    }

    // Step 1: create container
    const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    })
    const createData = await createRes.json() as { id?: string; error?: { message?: string } }
    if (!createRes.ok || !createData.id) {
      return NextResponse.json({ error: createData.error?.message ?? 'สร้าง media container ไม่สำเร็จ' }, { status: 400 })
    }

    // Step 2: publish
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: token }),
    })
    const publishData = await publishRes.json() as { id?: string; error?: { message?: string } }
    if (!publishRes.ok || !publishData.id) {
      await logPublishAttempt({ articleId, platform: 'instagram', status: 'failed', mode: 'manual', error: publishData.error?.message ?? 'Publish ไม่สำเร็จ', metadata: { type: 'photo' } })
      return NextResponse.json({ error: publishData.error?.message ?? 'Publish ไม่สำเร็จ' }, { status: 400 })
    }

    await db.update(articles).set({ igSent: true, igSentAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, articleId))
    await logPublishAttempt({ articleId, platform: 'instagram', status: 'success', mode: 'manual', metadata: { type: 'photo', postId: publishData.id } })
    await logAudit({ session, action: 'publish.instagram.photo', entityType: 'article', entityId: articleId, metadata: { postId: publishData.id } })
    return NextResponse.json({ ok: true, postId: publishData.id })
  }

  // Reel post
  if (mode === 'reel') {
    const videoUrl = article.igVideoUrl || article.ttVideoUrl
    if (!videoUrl) {
      return NextResponse.json({ error: 'ต้องมี Video URL ก่อนโพสต์ Reel — บันทึกวิดีโอใน TikTok section ก่อน' }, { status: 400 })
    }

    // Step 1: create Reel container
    const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: token,
      }),
    })
    const createData = await createRes.json() as { id?: string; error?: { message?: string } }
    if (!createRes.ok || !createData.id) {
      return NextResponse.json({ error: createData.error?.message ?? 'สร้าง Reel container ไม่สำเร็จ' }, { status: 400 })
    }

    // Step 2: wait for processing
    const waitResult = await waitForContainer(createData.id, token)
    if (!waitResult.ok) {
      return NextResponse.json({ error: waitResult.error }, { status: 400 })
    }

    // Step 3: publish
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: token }),
    })
    const publishData = await publishRes.json() as { id?: string; error?: { message?: string } }
    if (!publishRes.ok || !publishData.id) {
      await logPublishAttempt({ articleId, platform: 'instagram', status: 'failed', mode: 'manual', error: publishData.error?.message ?? 'Publish Reel ไม่สำเร็จ', metadata: { type: 'reel' } })
      return NextResponse.json({ error: publishData.error?.message ?? 'Publish Reel ไม่สำเร็จ' }, { status: 400 })
    }

    await db.update(articles).set({ igSent: true, igSentAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, articleId))
    await logPublishAttempt({ articleId, platform: 'instagram', status: 'success', mode: 'manual', metadata: { type: 'reel', postId: publishData.id } })
    await logAudit({ session, action: 'publish.instagram.reel', entityType: 'article', entityId: articleId, metadata: { postId: publishData.id } })
    return NextResponse.json({ ok: true, postId: publishData.id })
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
