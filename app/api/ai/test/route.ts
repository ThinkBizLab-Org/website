import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'

async function getAnthropicKey(): Promise<string> {
  try {
    const key = await getSetting('anthropic_api_key')
    if (key) return key
  } catch { /* fallback */ }
  return process.env.ANTHROPIC_API_KEY ?? ''
}

export async function POST(req: Request) {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const limited = rateLimit(req, { key: 'ai-test', limit: 20, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const apiKey = await getAnthropicKey()
  if (!apiKey) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า API Key' }, { status: 400 })

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ ok: true, model: 'claude-haiku-4-5', reply: text })
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number }
    return NextResponse.json({ ok: false, error: err?.message ?? String(e) }, { status: 500 })
  }
}
