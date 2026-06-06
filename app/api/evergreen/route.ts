import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { loadEvergreenConfig, parseEvergreenConfig, runEvergreenReshare, saveEvergreenConfig } from '@/lib/evergreen'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response
  return NextResponse.json({ ok: true, config: await loadEvergreenConfig() })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response
  const body = await req.json().catch(() => ({}))
  const config = await saveEvergreenConfig(parseEvergreenConfig(body.config ?? body))
  await logAudit({ session, action: 'evergreen.config.update', entityType: 'evergreen', metadata: config })
  return NextResponse.json({ ok: true, config })
}

// Manual "run now" for testing / on-demand re-share.
export async function POST() {
  const { session, response } = await requireAdmin('editor')
  if (response) return response
  const result = await runEvergreenReshare()
  await logAudit({ session, action: 'evergreen.run', entityType: 'evergreen', metadata: result })
  return NextResponse.json(result)
}
