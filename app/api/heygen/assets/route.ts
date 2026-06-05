import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'

async function getApiKey(): Promise<string> {
  return await getSetting('heygen_api_key') || process.env.HEYGEN_API_KEY || ''
}

export async function GET(req: Request) {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const limited = rateLimit(req, { key: 'heygen-assets', limit: 20, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const apiKey = await getApiKey()
  if (!apiKey) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า HeyGen API Key' }, { status: 400 })

  type Avatar = { avatar_id: string; avatar_name: string; preview_image_url?: string }
  type Voice  = { voice_id: string; name: string; language: string; gender: string; preview_audio?: string }

  const [avatarsRes, talkingPhotosRes, voicesRes] = await Promise.all([
    fetch('https://api.heygen.com/v2/avatars', { headers: { 'X-Api-Key': apiKey } }),
    fetch('https://api.heygen.com/v2/talking_photo', { headers: { 'X-Api-Key': apiKey } }).catch(() => null),
    fetch('https://api.heygen.com/v2/voices', { headers: { 'X-Api-Key': apiKey } }),
  ])

  const avatarsData = await avatarsRes.json() as { data?: { avatars?: Avatar[] } }
  const talkingPhotosData = talkingPhotosRes?.ok
    ? await talkingPhotosRes.json() as { data?: { talking_photos?: { talking_photo_id: string; talking_photo_name: string; preview_image_url?: string }[] } }
    : null
  const voicesData = await voicesRes.json() as { data?: { voices?: Voice[] } }

  // Merge stock avatars + custom talking photos into one list
  const stockAvatars: Avatar[] = avatarsData.data?.avatars ?? []
  const customAvatars: Avatar[] = (talkingPhotosData?.data?.talking_photos ?? []).map(tp => ({
    avatar_id: tp.talking_photo_id,
    avatar_name: tp.talking_photo_name,
    preview_image_url: tp.preview_image_url,
  }))

  return NextResponse.json({
    avatars: [...customAvatars, ...stockAvatars],
    voices: voicesData.data?.voices ?? [],
  })
}
