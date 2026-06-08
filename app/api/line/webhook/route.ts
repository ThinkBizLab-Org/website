import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSetting, setSetting } from '@/lib/settings-store'
import { getLineAccessToken } from '@/lib/line-token'
import { approveContentFactoryArticle, rejectContentFactoryArticle } from '@/lib/content-factory'
import { approveVideoByToken, rejectVideoByToken } from '@/lib/video-approval'

// Verify LINE webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('SHA256', secret).update(body).digest('base64')
  return hash === signature
}

async function getAdminIds(): Promise<string[]> {
  const raw = await getSetting('line_admin_user_ids') || (process.env.LINE_ADMIN_USER_IDS ?? '')
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

async function saveAdminIds(ids: string[]): Promise<void> {
  await setSetting('line_admin_user_ids', ids.join(','))
}

async function reply(replyToken: string, text: string, token: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

// Get the registration keyword from DB or use default
async function getRegisterKeyword(): Promise<string> {
  return (await getSetting('line_register_keyword')).trim() || 'admin register'
}

async function getChannelSecret(): Promise<string> {
  return await getSetting('line_channel_secret') || (process.env.LINE_CHANNEL_SECRET ?? '')
}

export async function POST(req: NextRequest) {
  const token = await getLineAccessToken()
  const channelSecret = await getChannelSecret()

  const rawBody = await req.text()

  // Verify signature if secret is configured — skip only during initial setup (no events anyway)
  if (channelSecret) {
    const signature = req.headers.get('x-line-signature') ?? ''
    if (!verifySignature(rawBody, signature, channelSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  type LineEvent = {
    type: string
    replyToken?: string
    message?: { type: string; text: string }
    source?: { userId?: string }
  }

  let body: { events?: LineEvent[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const events: LineEvent[] = body.events ?? []

  // If no access token, can't reply — but still return 200 so LINE verification passes
  if (!token) return NextResponse.json({ ok: true })

  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const userId = event.source?.userId
    const rawText = event.message?.text?.trim() ?? ''
    const text = rawText.toLowerCase()
    const replyToken = event.replyToken

    if (!userId || !replyToken) continue

    const keyword = await getRegisterKeyword()

    if (text === keyword.toLowerCase()) {
      const adminIds = await getAdminIds()

      if (adminIds.includes(userId)) {
        await reply(replyToken, `✅ คุณเป็น Admin อยู่แล้ว\nUser ID: ${userId}`, token)
      } else {
        adminIds.push(userId)
        await saveAdminIds(adminIds)
        await reply(replyToken, `✅ ลงทะเบียนเป็น Admin สำเร็จ!\nUser ID: ${userId}\n\nคุณจะได้รับข้อความทดสอบทุกครั้งที่มีการ Broadcast`, token)
      }
    } else if (text === 'admin remove' || text === 'admin unregister') {
      const adminIds = await getAdminIds()
      const filtered = adminIds.filter(id => id !== userId)

      if (filtered.length === adminIds.length) {
        await reply(replyToken, `ℹ️ คุณไม่ได้อยู่ในรายชื่อ Admin`, token)
      } else {
        await saveAdminIds(filtered)
        await reply(replyToken, `✅ ลบออกจากรายชื่อ Admin แล้ว`, token)
      }
    } else if (text.startsWith('approve-video ')) {
      const adminIds = await getAdminIds()
      if (!adminIds.includes(userId)) {
        await reply(replyToken, '⛔ เฉพาะ Admin ที่ลงทะเบียนแล้วเท่านั้นที่อนุมัติวิดีโอได้', token)
        continue
      }

      const code = rawText.replace(/^approve-video\s+/i, '').trim()
      const result = await approveVideoByToken(code, `line:${userId}`)
      await reply(replyToken, result.message, token)
    } else if (text.startsWith('reject-video ')) {
      const adminIds = await getAdminIds()
      if (!adminIds.includes(userId)) {
        await reply(replyToken, '⛔ เฉพาะ Admin ที่ลงทะเบียนแล้วเท่านั้นที่ปฏิเสธวิดีโอได้', token)
        continue
      }

      const match = rawText.match(/^reject-video\s+(\S+)(?:\s+(.+))?$/i)
      if (!match) {
        await reply(replyToken, 'Format: reject-video CODE เหตุผล', token)
        continue
      }
      const result = await rejectVideoByToken(match[1], match[2] ?? '', `line:${userId}`)
      await reply(replyToken, result.message, token)
    } else if (text.startsWith('approve ')) {
      const adminIds = await getAdminIds()
      if (!adminIds.includes(userId)) {
        await reply(replyToken, '⛔ เฉพาะ Admin ที่ลงทะเบียนแล้วเท่านั้นที่ approve content ได้', token)
        continue
      }

      const approvalToken = text.replace(/^approve\s+/i, '').trim()
      const result = await approveContentFactoryArticle(approvalToken, `line:${userId}`)
      await reply(replyToken, result.message, token)
    } else if (text.startsWith('reject ')) {
      const adminIds = await getAdminIds()
      if (!adminIds.includes(userId)) {
        await reply(replyToken, '⛔ เฉพาะ Admin ที่ลงทะเบียนแล้วเท่านั้นที่ reject content ได้', token)
        continue
      }

      const match = rawText.match(/^reject\s+(\S+)(?:\s+(.+))?$/i)
      if (!match) {
        await reply(replyToken, 'Format: reject CODE reason', token)
        continue
      }
      const result = await rejectContentFactoryArticle(match[1], match[2] ?? '', `line:${userId}`)
      await reply(replyToken, result.message, token)
    }
  }

  return NextResponse.json({ ok: true })
}
