import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSettings } from '@/lib/settings-store'

export async function GET() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const map = await getSettings(['fb_page_access_token', 'fb_page_id'])
  const token = map['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN || ''
  const pageId = map['fb_page_id'] || process.env.FB_PAGE_ID || ''

  if (!token || !pageId) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า FB Page Access Token หรือ Page ID' }, { status: 400 })
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account&access_token=${token}`
  )
  const data = await res.json() as {
    instagram_business_account?: { id: string }
    error?: { message: string }
  }

  if (!res.ok || data.error) {
    return NextResponse.json({ error: data.error?.message ?? 'ดึงข้อมูล IG Account ไม่สำเร็จ' }, { status: 400 })
  }

  const igId = data.instagram_business_account?.id
  if (!igId) {
    return NextResponse.json({ error: 'ไม่พบ Instagram Business Account ที่เชื่อมกับ Page นี้' }, { status: 404 })
  }

  // Fetch username
  const igRes = await fetch(
    `https://graph.facebook.com/v20.0/${igId}?fields=username,name&access_token=${token}`
  )
  const igData = await igRes.json() as { username?: string; name?: string; error?: { message: string } }

  return NextResponse.json({ igUserId: igId, username: igData.username, name: igData.name })
}
