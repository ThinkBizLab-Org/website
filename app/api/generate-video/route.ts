import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSettings } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'
import { clampScriptToSeconds } from '@/lib/video-pipeline'

async function getHeyGenConfig() {
  const map = await getSettings(['heygen_api_key', 'heygen_avatar_id', 'heygen_avatar_look_id', 'heygen_voice_id'])
  return {
    apiKey:       map['heygen_api_key']          || process.env.HEYGEN_API_KEY   || '',
    avatarId:     map['heygen_avatar_id']         || process.env.HEYGEN_AVATAR_ID || '',
    avatarLookId: map['heygen_avatar_look_id']    || '',
    voiceId:      map['heygen_voice_id']          || process.env.HEYGEN_VOICE_ID  || '',
  }
}

// POST — submit video job, return videoId immediately
export async function POST(req: NextRequest) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'generate-video', limit: 15, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const { script } = await req.json() as { script: string }
  if (!script?.trim()) return NextResponse.json({ error: 'กรุณาใส่ script' }, { status: 400 })

  const { apiKey, avatarId, avatarLookId, voiceId } = await getHeyGenConfig()
  if (!apiKey)   return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า HeyGen API Key — ไปที่ Admin → Settings → HeyGen' }, { status: 400 })
  if (!avatarId) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Avatar ID — ไปที่ Admin → Settings → HeyGen' }, { status: 400 })
  if (!voiceId)  return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Voice ID — ไปที่ Admin → Settings → HeyGen' }, { status: 400 })

  const character: Record<string, string> = { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' }
  if (avatarLookId) character.avatar_look_id = avatarLookId

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{
        character,
        voice: { type: 'text', input_text: clampScriptToSeconds(script.trim(), 45), voice_id: voiceId, speed: 1.0 },
      }],
      dimension: { width: 1080, height: 1920 },  // 9:16 portrait for TikTok
      caption: true,  // burn-in subtitles for sound-off viewing
    }),
  })

  const data = await res.json() as { data?: { video_id?: string }; error?: { message?: string } }
  if (!res.ok || data.error) {
    return NextResponse.json({ error: data.error?.message ?? `HeyGen error ${res.status}` }, { status: 500 })
  }

  return NextResponse.json({ videoId: data.data?.video_id })
}

// GET — poll status, return videoUrl when done
export async function GET(req: NextRequest) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const videoId = new URL(req.url).searchParams.get('videoId')
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })

  const { apiKey } = await getHeyGenConfig()

  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  const data = await res.json() as { data?: { status?: string; video_url?: string; duration?: number; error?: string } }
  const v = data.data

  if (v?.status === 'completed') {
    return NextResponse.json({ status: 'COMPLETED', videoUrl: v.video_url, duration: v.duration })
  }
  if (v?.status === 'failed') {
    return NextResponse.json({ status: 'FAILED', error: v.error ?? 'Video generation failed' })
  }

  // processing / waiting / pending
  return NextResponse.json({ status: 'PROCESSING' })
}
