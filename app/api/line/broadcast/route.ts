import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit, logPublishAttempt } from '@/lib/audit'

// Build LINE messages array: image (if available) + text
function buildMessages(text: string, coverImage?: string | null): object[] {
  const msgs: object[] = []
  if (coverImage) {
    msgs.push({
      type: 'image',
      originalContentUrl: coverImage,
      previewImageUrl: coverImage,
    })
  }
  msgs.push({ type: 'text', text })
  return msgs
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdmin()
  if (response) return response

  const limited = rateLimit(req, { key: 'line-broadcast', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { articleId, message, mode } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (!['test', 'all'].includes(mode)) return NextResponse.json({ error: 'mode must be test or all' }, { status: 400 })

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 })

  // Look up cover image from article
  let coverImage: string | null = null
  if (articleId) {
    const [article] = await db.select({ coverImage: articles.coverImage }).from(articles).where(eq(articles.id, articleId))
    coverImage = article?.coverImage ?? null
  }

  try {
    if (mode === 'test') {
      // Multicast to all LINE OA admins — DB takes precedence over env var
      const raw = await getSetting('line_admin_user_ids') || (process.env.LINE_ADMIN_USER_IDS ?? process.env.LINE_ADMIN_USER_ID ?? '')
      const adminIds = raw.split(',').map(s => s.trim()).filter(Boolean)
      if (adminIds.length === 0) {
        return NextResponse.json({ error: 'ยังไม่มี Admin LINE User IDs — ไปที่ Admin Settings → LINE Admin User IDs แล้วใส่ User ID ของ Admin' }, { status: 500 })
      }

      const messages = buildMessages(`[TEST]\n${message}`, coverImage)
      const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: adminIds, messages }),
      })
      if (!res.ok) {
        const err = await res.json()
        await logPublishAttempt({ articleId, platform: 'line', status: 'failed', mode: 'test', error: JSON.stringify(err) })
        return NextResponse.json({ error: JSON.stringify(err) }, { status: 500 })
      }
      await logPublishAttempt({ articleId, platform: 'line', status: 'success', mode: 'test', metadata: { sentTo: adminIds.length } })
      return NextResponse.json({ ok: true, mode: 'test', sentTo: adminIds.length })
    }

    // mode === 'all' — broadcast to all followers
    const messages = buildMessages(message, coverImage)
    const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) {
      const err = await res.json()
      await logPublishAttempt({ articleId, platform: 'line', status: 'failed', mode: 'manual', error: JSON.stringify(err) })
      return NextResponse.json({ error: JSON.stringify(err) }, { status: 500 })
    }

    // Mark article as broadcast sent
    if (articleId) {
      await db.update(articles)
        .set({ lineBroadcastSent: true, lineBroadcastAt: new Date() })
        .where(eq(articles.id, articleId))
    }

    await logPublishAttempt({ articleId, platform: 'line', status: 'success', mode: 'manual' })
    await logAudit({ session, action: 'publish.line', entityType: 'article', entityId: articleId ?? null, metadata: { mode } })

    return NextResponse.json({ ok: true, mode: 'all' })
  } catch (e) {
    await logPublishAttempt({ articleId, platform: 'line', status: 'failed', mode: mode === 'test' ? 'test' : 'manual', error: String(e) })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
