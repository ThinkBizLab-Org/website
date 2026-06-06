import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { findStaleArticles, loadStaleContentConfig, parseStaleContentConfig, runStaleRefresh, saveStaleContentConfig } from '@/lib/stale-content'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response
  const config = await loadStaleContentConfig()
  const stale = await findStaleArticles(config).catch(() => [])
  return NextResponse.json({ ok: true, config, stale })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response
  const body = await req.json().catch(() => ({}))
  const config = await saveStaleContentConfig(parseStaleContentConfig(body.config ?? body))
  await logAudit({ session, action: 'stale_content.config.update', entityType: 'stale_content', metadata: config })
  return NextResponse.json({ ok: true, config })
}

export async function POST() {
  const { session, response } = await requireAdmin('editor')
  if (response) return response
  const result = await runStaleRefresh()
  await logAudit({ session, action: 'stale_content.run', entityType: 'stale_content', metadata: { refreshed: result.refreshed } })
  return NextResponse.json(result)
}
