import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings-store'
import { rateLimit } from '@/lib/rate-limit'

// Lists ElevenLabs voices for the Settings voice picker, scoped to Thai-capable
// voices, and adds a shared/library voice to the account so its voice_id becomes
// usable by the TTS path (lib/tts.ts → eleven_multilingual_v2).

const EL_BASE = 'https://api.elevenlabs.io/v1'

async function getApiKey(): Promise<string> {
  return (await getSetting('elevenlabs_api_key')) || process.env.ELEVENLABS_API_KEY || ''
}

export type VoiceOption = {
  voice_id: string
  name: string
  source: 'mine' | 'library'
  language?: string
  accent?: string
  gender?: string
  preview_url?: string
  public_owner_id?: string
}

// GET — return the account's own voices + Thai voices from the shared library.
export async function GET(req: Request) {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const limited = rateLimit(req, { key: 'elevenlabs-voices', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const apiKey = await getApiKey()
  if (!apiKey) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า ElevenLabs API Key — ใส่ API Key ก่อน' }, { status: 400 })

  const headers = { 'xi-api-key': apiKey }

  type MyVoice = {
    voice_id: string
    name?: string
    labels?: Record<string, string>
    preview_url?: string
    verified_languages?: { language?: string }[]
  }
  type SharedVoice = {
    voice_id: string
    public_owner_id?: string
    name?: string
    preview_url?: string
    language?: string
    accent?: string
    gender?: string
  }

  const [mineRes, libRes] = await Promise.all([
    fetch(`${EL_BASE}/voices`, { headers }).catch(() => null),
    fetch(`${EL_BASE}/shared-voices?language=th&page_size=100`, { headers }).catch(() => null),
  ])

  if (mineRes && mineRes.status === 401) {
    return NextResponse.json({ error: 'ElevenLabs API Key ไม่ถูกต้อง (401)' }, { status: 400 })
  }

  const mineData = mineRes?.ok ? (await mineRes.json()) as { voices?: MyVoice[] } : { voices: [] }
  const libData = libRes?.ok ? (await libRes.json()) as { voices?: SharedVoice[] } : { voices: [] }

  const speaksThai = (v: MyVoice) =>
    (v.verified_languages?.some(l => /th/i.test(l.language ?? '')) ?? false) ||
    Object.values(v.labels ?? {}).some(val => /thai|^th$/i.test(String(val)))

  const myVoices: VoiceOption[] = (mineData.voices ?? []).map(v => ({
    voice_id: v.voice_id,
    name: v.name ?? v.voice_id,
    source: 'mine',
    language: speaksThai(v) ? 'th' : v.labels?.language,
    accent: v.labels?.accent,
    gender: v.labels?.gender,
    preview_url: v.preview_url,
  }))
  // Thai-verified voices first so the most relevant options surface at the top.
  myVoices.sort((a, b) => Number(b.language === 'th') - Number(a.language === 'th'))

  const libraryVoices: VoiceOption[] = (libData.voices ?? []).map(v => ({
    voice_id: v.voice_id,
    name: v.name ?? v.voice_id,
    source: 'library',
    language: v.language ?? 'th',
    accent: v.accent,
    gender: v.gender,
    preview_url: v.preview_url,
    public_owner_id: v.public_owner_id,
  }))

  return NextResponse.json({ myVoices, libraryVoices })
}

// POST — add a shared/library voice to the account, returning a usable voice_id.
export async function POST(req: Request) {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const limited = rateLimit(req, { key: 'elevenlabs-add-voice', limit: 20, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const apiKey = await getApiKey()
  if (!apiKey) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า ElevenLabs API Key' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { public_owner_id?: string; voice_id?: string; name?: string }
  const ownerId = String(body.public_owner_id ?? '').trim()
  const voiceId = String(body.voice_id ?? '').trim()
  const name = String(body.name ?? '').trim() || 'Thai Voice'
  if (!ownerId || !voiceId) {
    return NextResponse.json({ error: 'ต้องมี public_owner_id และ voice_id' }, { status: 400 })
  }

  // Skip re-adding if a voice with the same name is already in the account
  // (avoids burning a voice slot on repeat selections).
  const existingRes = await fetch(`${EL_BASE}/voices`, { headers: { 'xi-api-key': apiKey } }).catch(() => null)
  if (existingRes?.ok) {
    const existing = (await existingRes.json()) as { voices?: { voice_id: string; name?: string }[] }
    const match = existing.voices?.find(v => v.name === name)
    if (match) return NextResponse.json({ ok: true, voice_id: match.voice_id, alreadyAdded: true })
  }

  const addRes = await fetch(
    `${EL_BASE}/voices/add/${encodeURIComponent(ownerId)}/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: name }),
    },
  )
  if (!addRes.ok) {
    const txt = await addRes.text()
    return NextResponse.json(
      { error: `เพิ่มเสียงเข้าบัญชีไม่สำเร็จ (${addRes.status}): ${txt.slice(0, 200)}` },
      { status: 400 },
    )
  }
  const added = (await addRes.json()) as { voice_id?: string }
  return NextResponse.json({ ok: true, voice_id: added.voice_id ?? voiceId })
}
