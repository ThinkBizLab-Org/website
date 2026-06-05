import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { maskSecret } from '@/lib/secrets'
import { setSetting } from '@/lib/settings-store'
import { settingInputSchema, validationError } from '@/lib/validators'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { response } = await requireAdmin('admin')
  if (response) return response

  const rows = await db.select().from(settings)
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const enabled = map['cron_enabled'] !== 'false'
  const lineAdminIds = map['line_admin_user_ids'] ?? process.env.LINE_ADMIN_USER_IDS ?? ''

  const mask = (k: string) => {
    const v = map[k] ?? ''
    return {
      set: !!v,
      masked: maskSecret(v),
    }
  }

  const anthropic = mask('anthropic_api_key')
  const fal = mask('fal_api_key')
  const heygen = mask('heygen_api_key')
  const lineSecret = mask('line_channel_secret')
  const fbToken = mask('fb_page_access_token')

  const analyticsPlain = (k: string) => map[k] ?? ''

  return NextResponse.json({
    cron_enabled: enabled,
    content_factory_enabled: map['content_factory_enabled'] === 'true',
    content_factory_daily_count: Number(map['content_factory_daily_count'] ?? 1),
    content_factory_days_ahead: Number(map['content_factory_days_ahead'] ?? 7),
    content_factory_publish_hour: Number(map['content_factory_publish_hour'] ?? 9),
    content_factory_topic_bank: map['content_factory_topic_bank'] ?? '',
    anthropic_key_set: anthropic.set,
    anthropic_key_masked: anthropic.masked,
    fal_key_set: fal.set,
    fal_key_masked: fal.masked,
    heygen_key_set: heygen.set,
    heygen_key_masked: heygen.masked,
    heygen_avatar_id: analyticsPlain('heygen_avatar_id'),
    heygen_avatar_look_id: analyticsPlain('heygen_avatar_look_id'),
    heygen_voice_id: analyticsPlain('heygen_voice_id'),
    timezone: map['timezone'] ?? 'Asia/Bangkok',
    line_admin_user_ids: lineAdminIds,
    line_register_keyword: map['line_register_keyword'] ?? 'admin register',
    line_channel_secret_set: lineSecret.set,
    line_channel_secret_masked: lineSecret.masked,
    ga_measurement_id: analyticsPlain('ga_measurement_id'),
    fb_pixel_id: analyticsPlain('fb_pixel_id'),
    tiktok_pixel_id: analyticsPlain('tiktok_pixel_id'),
    fb_page_token_set: fbToken.set,
    fb_page_token_masked: fbToken.masked,
    fb_page_id: analyticsPlain('fb_page_id'),
    ig_user_id: analyticsPlain('ig_user_id'),
  })
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response

  const parsed = settingInputSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
  const body = parsed.data
  const save = async (key: string, value: string) => {
    await setSetting(key, value)
    await logAudit({
      session,
      action: 'settings.update',
      entityType: 'settings',
      entityId: key,
      metadata: { key, secret: ['anthropic_api_key', 'fal_api_key', 'line_channel_secret', 'heygen_api_key', 'fb_page_access_token'].includes(key) },
    })
  }

  if ('cron_enabled' in body) {
    await save('cron_enabled', String(body.cron_enabled))
    return NextResponse.json({ cron_enabled: body.cron_enabled })
  }

  if ('content_factory_enabled' in body) {
    await save('content_factory_enabled', String(body.content_factory_enabled))
    return NextResponse.json({ content_factory_enabled: body.content_factory_enabled })
  }

  for (const key of ['content_factory_daily_count', 'content_factory_days_ahead', 'content_factory_publish_hour', 'content_factory_topic_bank'] as const) {
    if (key in body) {
      await save(key, String(body[key] ?? ''))
      return NextResponse.json({ ok: true })
    }
  }

  if ('timezone' in body) {
    const tz = String(body.timezone).trim()
    if (!tz) return NextResponse.json({ error: 'Timezone cannot be empty' }, { status: 400 })
    await save('timezone', tz)
    return NextResponse.json({ ok: true })
  }

  if ('anthropic_api_key' in body) {
    const key = String(body.anthropic_api_key).trim()
    if (!key) return NextResponse.json({ error: 'Key cannot be empty' }, { status: 400 })
    await save('anthropic_api_key', key)
    return NextResponse.json({ ok: true })
  }

  if ('fal_api_key' in body) {
    const key = String(body.fal_api_key).trim()
    if (!key) return NextResponse.json({ error: 'Key cannot be empty' }, { status: 400 })
    await save('fal_api_key', key)
    return NextResponse.json({ ok: true })
  }

  if ('line_admin_user_ids' in body) {
    const ids = String(body.line_admin_user_ids).trim()
    await save('line_admin_user_ids', ids)
    return NextResponse.json({ ok: true })
  }

  if ('line_register_keyword' in body) {
    const kw = String(body.line_register_keyword).trim()
    if (!kw) return NextResponse.json({ error: 'Keyword cannot be empty' }, { status: 400 })
    await save('line_register_keyword', kw)
    return NextResponse.json({ ok: true })
  }

  if ('line_channel_secret' in body) {
    const secret = String(body.line_channel_secret).trim()
    if (!secret) return NextResponse.json({ error: 'Secret cannot be empty' }, { status: 400 })
    await save('line_channel_secret', secret)
    return NextResponse.json({ ok: true })
  }

  for (const key of ['heygen_api_key', 'heygen_avatar_id', 'heygen_avatar_look_id', 'heygen_voice_id'] as const) {
    if (key in body) {
      const val = String(body[key]).trim()
      await save(key, val)
      return NextResponse.json({ ok: true })
    }
  }

  if ('fb_page_access_token' in body) {
    const val = String(body.fb_page_access_token).trim()
    if (!val) return NextResponse.json({ error: 'Token cannot be empty' }, { status: 400 })
    await save('fb_page_access_token', val)
    return NextResponse.json({ ok: true })
  }

  if ('fb_page_id' in body) {
    const val = String(body.fb_page_id).trim()
    await save('fb_page_id', val)
    return NextResponse.json({ ok: true })
  }

  if ('ig_user_id' in body) {
    const val = String(body.ig_user_id).trim()
    await save('ig_user_id', val)
    return NextResponse.json({ ok: true })
  }

  for (const key of ['ga_measurement_id', 'fb_pixel_id', 'tiktok_pixel_id'] as const) {
    if (key in body) {
      const val = String(body[key]).trim()
      await save(key, val)
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: 'Unknown setting' }, { status: 400 })
}
