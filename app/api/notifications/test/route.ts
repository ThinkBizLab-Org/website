import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { dispatchNotification, normalizeNotificationEvent } from '@/lib/notifications'

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const event = normalizeNotificationEvent(body.event) ?? 'dead_letter'

  const result = await dispatchNotification({
    event,
    title: 'Test notification',
    message: `Test notification for "${event}" triggered by ${session.user?.email ?? 'admin'}.`,
    context: { test: true },
  })

  await logAudit({ session, action: 'notifications.test', entityType: 'notification_log', metadata: { event, results: result.results } })
  return NextResponse.json({ ok: true, ...result })
}
