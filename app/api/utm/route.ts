import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { getSetting, setSetting } from '@/lib/settings-store'
import { UTM_CONFIG_SETTING, UTM_PLATFORMS, parseUtmConfig } from '@/lib/utm'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  let raw: string | null = null
  try {
    raw = await getSetting(UTM_CONFIG_SETTING)
  } catch {
    raw = null
  }
  return NextResponse.json({ ok: true, config: parseUtmConfig(raw), platforms: UTM_PLATFORMS })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const config = parseUtmConfig(body.config ?? body)
  await setSetting(UTM_CONFIG_SETTING, JSON.stringify(config))
  await logAudit({ session, action: 'utm.config.update', entityType: 'utm_config', metadata: { baseUrl: config.baseUrl, medium: config.medium } })
  return NextResponse.json({ ok: true, config })
}
