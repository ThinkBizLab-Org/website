import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/schema'

function html(title: string, message: string) {
  return new NextResponse(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;background:#0A0812;color:#fff;display:grid;min-height:100vh;place-items:center;margin:0"><main style="max-width:520px;padding:32px"><h1>${title}</h1><p style="color:#c4b5fd;line-height:1.7">${message}</p><a href="/" style="color:#a78bfa">กลับหน้าแรก</a></main></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return html('Invalid unsubscribe', 'ไม่พบ unsubscribe token')

  const now = new Date()
  const [subscriber] = await db.update(subscribers)
    .set({ status: 'unsubscribed', unsubscribedAt: now, updatedAt: now })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning()

  if (!subscriber) return html('Invalid unsubscribe', 'token ไม่ถูกต้องหรือหมดอายุ')
  return html('ยกเลิกการรับข่าวสารแล้ว', `อีเมล ${subscriber.email ?? ''} ถูกยกเลิกจาก newsletter แล้ว`)
}
