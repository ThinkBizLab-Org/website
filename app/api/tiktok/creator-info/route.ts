import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getTiktokAccessToken } from '@/lib/tiktok-token'
import { isTiktokAudited, queryTiktokCreatorInfo } from '@/lib/tiktok-post'

// Powers the Direct Post compliance panel: who we post as, which privacy levels
// and interaction settings the creator allows, and whether the app is audited.
export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const token = await getTiktokAccessToken()
  if (!token) return NextResponse.json({ ok: false, error: 'TikTok ยังไม่ได้เชื่อมต่อ — ไปที่ Admin → TikTok' })

  const info = await queryTiktokCreatorInfo(token)
  if (!info) return NextResponse.json({ ok: false, error: 'ดึงข้อมูล creator จาก TikTok ไม่ได้' })

  return NextResponse.json({ ok: true, audited: await isTiktokAudited(), ...info })
}
