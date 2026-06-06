import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { loadAutoApproveConfig, parseAutoApproveConfig, saveAutoApproveConfig } from '@/lib/auto-approve'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response
  return NextResponse.json({ ok: true, config: await loadAutoApproveConfig() })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response
  const body = await req.json().catch(() => ({}))
  const config = await saveAutoApproveConfig(parseAutoApproveConfig(body.config ?? body))
  await logAudit({ session, action: 'auto_approve.config.update', entityType: 'auto_approve', metadata: config })
  return NextResponse.json({ ok: true, config })
}
