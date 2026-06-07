import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getLineAccessToken } from '@/lib/line-token'

export async function POST() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const token = await getLineAccessToken()
  if (!token) return NextResponse.json({ ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' })

  try {
    const res = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_endpoint: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? 'https://thinkbizlab.com'}/api/line/webhook` }),
    })
    const data = await res.json()
    if (data.success) {
      return NextResponse.json({ ok: true, msg: `✓ Webhook ตอบสนองปกติ (${data.statusCode})` })
    }
    return NextResponse.json({ ok: false, error: `Webhook ตอบ ${data.statusCode ?? 'error'}: ${data.reason ?? JSON.stringify(data)}` })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
