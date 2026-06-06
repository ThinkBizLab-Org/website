import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { formatBrandVoiceGuidance, loadBrandVoice, parseBrandVoice, saveBrandVoice } from '@/lib/brand-voice'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const profile = await loadBrandVoice()
  return NextResponse.json({ ok: true, profile, preview: formatBrandVoiceGuidance(profile) })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const profile = await saveBrandVoice(parseBrandVoice(body.profile ?? body))
  await logAudit({ session, action: 'brand_voice.update', entityType: 'brand_voice', metadata: { tone: profile.tone, keywords: profile.keywords } })
  return NextResponse.json({ ok: true, profile, preview: formatBrandVoiceGuidance(profile) })
}
