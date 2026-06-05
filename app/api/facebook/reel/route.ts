import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getSettings } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'

async function getFbCredentials(): Promise<{ token: string; pageId: string }> {
  const map = await getSettings(['fb_page_access_token', 'fb_page_id'])
  return {
    token: map['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN || '',
    pageId: map['fb_page_id'] || process.env.FB_PAGE_ID || '',
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'facebook-reel', limit: 20, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId } = await req.json() as { articleId: string }

  const { token, pageId } = await getFbCredentials()
  if (!token || !pageId) {
    return NextResponse.json({
      error: 'ยังไม่ได้ตั้งค่า FB Page Access Token หรือ Page ID — ไปที่ Admin Settings → Facebook'
    }, { status: 400 })
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId))
  if (!article) return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 })

  const videoUrl = article.ttVideoUrl
  if (!videoUrl) return NextResponse.json({ error: 'ต้องมี Video URL ก่อนโพสต์ Facebook Reel' }, { status: 400 })

  const description = [article.fbCaption ?? article.ttCaption ?? '', article.fbHashtags ?? ''].filter(Boolean).join('\n\n')

  // Step 1: start upload phase
  const startRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_phase: 'start', access_token: token }),
  })
  const startData = await startRes.json() as { video_id?: string; upload_url?: string; error?: { message?: string } }
  if (!startRes.ok || !startData.video_id) {
    return NextResponse.json({ error: startData.error?.message ?? 'เริ่ม upload Reel ไม่สำเร็จ' }, { status: 400 })
  }

  const { video_id: videoId, upload_url: uploadUrl } = startData

  // Step 2: upload video from URL
  const uploadRes = await fetch(uploadUrl!, {
    method: 'POST',
    headers: { file_url: videoUrl },
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    return NextResponse.json({ error: `Upload video ไม่สำเร็จ: ${err}` }, { status: 400 })
  }

  // Step 3: wait briefly for processing
  await sleep(3000)

  // Step 4: finish / publish
  const finishRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'finish',
      video_id: videoId,
      video_state: 'PUBLISHED',
      description,
      access_token: token,
    }),
  })
  const finishData = await finishRes.json() as { success?: boolean; error?: { message?: string } }
  if (!finishRes.ok || finishData.error) {
    return NextResponse.json({ error: finishData.error?.message ?? 'Publish Reel ไม่สำเร็จ' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, videoId })
}
