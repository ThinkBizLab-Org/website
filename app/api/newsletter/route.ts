import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { getNewsletterArticles, loadNewsletterConfig, parseNewsletterConfig, saveNewsletterConfig, sendNewsletter } from '@/lib/newsletter'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response
  const config = await loadNewsletterConfig()
  const preview = await getNewsletterArticles(config).catch(() => [])
  return NextResponse.json({ ok: true, config, preview })
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response
  const body = await req.json().catch(() => ({}))
  const config = await saveNewsletterConfig(parseNewsletterConfig(body.config ?? body))
  await logAudit({ session, action: 'newsletter.config.update', entityType: 'newsletter', metadata: config })
  return NextResponse.json({ ok: true, config })
}

// Manual send now (ignores the enabled flag and the de-dupe guard).
export async function POST() {
  const { session, response } = await requireAdmin('admin')
  if (response) return response
  const result = await sendNewsletter({ manual: true })
  await logAudit({ session, action: 'newsletter.send.manual', entityType: 'newsletter', metadata: { sent: result.sent, failed: result.failed } })
  return NextResponse.json(result)
}
