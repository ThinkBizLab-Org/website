import { getSetting, setSetting } from './settings-store'

// A persistent brand voice profile that is remembered across every AI
// generation, so articles and captions stay on-brand without re-specifying tone
// each time.
export type BrandVoiceProfile = {
  tone: string
  audience: string
  dos: string[]
  donts: string[]
  samplePhrases: string[]
  keywords: string[]
}

export const BRAND_VOICE_SETTING = 'brand_voice'

export const EMPTY_BRAND_VOICE: BrandVoiceProfile = {
  tone: '',
  audience: '',
  dos: [],
  donts: [],
  samplePhrases: [],
  keywords: [],
}

function normalizeList(value: unknown, limit = 20): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean).slice(0, limit)
  if (typeof value === 'string') return value.split('\n').map(item => item.trim()).filter(Boolean).slice(0, limit)
  return []
}

export function parseBrandVoice(raw: unknown): BrandVoiceProfile {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  }

  return {
    tone: String(source.tone ?? '').trim().slice(0, 400),
    audience: String(source.audience ?? '').trim().slice(0, 400),
    dos: normalizeList(source.dos),
    donts: normalizeList(source.donts),
    samplePhrases: normalizeList(source.samplePhrases),
    keywords: normalizeList(source.keywords),
  }
}

export function isBrandVoiceEmpty(profile: BrandVoiceProfile): boolean {
  return (
    !profile.tone &&
    !profile.audience &&
    profile.dos.length === 0 &&
    profile.donts.length === 0 &&
    profile.samplePhrases.length === 0 &&
    profile.keywords.length === 0
  )
}

// Renders the profile as a guidance block to append to a generation system
// prompt. Returns '' when the profile is empty so prompts stay clean.
export function formatBrandVoiceGuidance(profile: BrandVoiceProfile): string {
  if (isBrandVoiceEmpty(profile)) return ''

  const lines: string[] = ['Brand voice guidelines (follow these strictly):']
  if (profile.tone) lines.push(`- Tone: ${profile.tone}`)
  if (profile.audience) lines.push(`- Audience: ${profile.audience}`)
  if (profile.dos.length) lines.push(`- Do: ${profile.dos.join('; ')}`)
  if (profile.donts.length) lines.push(`- Avoid: ${profile.donts.join('; ')}`)
  if (profile.samplePhrases.length) lines.push(`- Preferred phrases: ${profile.samplePhrases.join('; ')}`)
  if (profile.keywords.length) lines.push(`- Brand keywords to weave in naturally: ${profile.keywords.join(', ')}`)
  return lines.join('\n')
}

export function applyBrandVoiceToSystem(systemPrompt: string, profile: BrandVoiceProfile): string {
  const guidance = formatBrandVoiceGuidance(profile)
  return guidance ? `${systemPrompt}\n\n${guidance}` : systemPrompt
}

export async function loadBrandVoice(): Promise<BrandVoiceProfile> {
  try {
    return parseBrandVoice(await getSetting(BRAND_VOICE_SETTING))
  } catch {
    return { ...EMPTY_BRAND_VOICE }
  }
}

export async function saveBrandVoice(profile: BrandVoiceProfile): Promise<BrandVoiceProfile> {
  const normalized = parseBrandVoice(profile)
  await setSetting(BRAND_VOICE_SETTING, JSON.stringify(normalized))
  return normalized
}
