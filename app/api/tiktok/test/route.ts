import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'

export async function GET() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const rows = await db.select({ expiresAt: settings.expiresAt }).from(settings).where(eq(settings.key, 'tiktok_access_token'))
  const token = await getSetting('tiktok_access_token')
  const expiresAt = rows[0]?.expiresAt

  if (!token) {
    return NextResponse.json({ ok: false, error: 'ยังไม่ได้เชื่อมต่อ TikTok — กรุณา Login ก่อน' })
  }

  // Call TikTok user info to verify token is still valid
  const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as {
    data?: { user?: { display_name?: string; avatar_url?: string } }
    error?: { code?: string; message?: string }
  }

  if (!res.ok || data.error?.code !== 'ok') {
    const msg = data.error?.message ?? `HTTP ${res.status}`
    return NextResponse.json({ ok: false, error: `Token ไม่ valid: ${msg}` })
  }

  const user = data.data?.user
  return NextResponse.json({
    ok: true,
    displayName: user?.display_name ?? 'Unknown',
    avatarUrl: user?.avatar_url,
    expiresAt: expiresAt?.toISOString() ?? null,
  })
}
