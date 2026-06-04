import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'

async function getFalKey(): Promise<string> {
  try {
    const key = await getSetting('fal_api_key')
    if (key) return key
  } catch { /* fallback */ }
  return process.env.FAL_KEY ?? ''
}

export async function POST(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const limited = rateLimit(req, { key: 'fal-test', limit: 10, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const falKey = await getFalKey()
  if (!falKey) return NextResponse.json({ ok: false, error: 'ยังไม่ได้ตั้งค่า fal.ai API Key' })

  try {
    // Minimal request — list models to verify key without spending credits
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', num_inference_steps: 1, num_images: 1, image_size: { width: 64, height: 64 } }),
    })

    if (res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ ok: false, error: `API Key ไม่ถูกต้องหรือ balance หมด: ${err?.detail ?? res.status}` })
    }

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `fal.ai error: ${res.status}` })
    }

    return NextResponse.json({ ok: true, msg: '✓ เชื่อมต่อ fal.ai สำเร็จ' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
