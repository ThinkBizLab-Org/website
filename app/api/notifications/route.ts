import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  listNotifications,
  loadRouting,
  parseRouting,
  saveRouting,
} from '@/lib/notifications'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const [log, routing] = await Promise.all([listNotifications(), loadRouting()])
  return NextResponse.json({ ok: true, log, routing, events: NOTIFICATION_EVENTS, channels: NOTIFICATION_CHANNELS })
}

export async function PATCH(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  if (!body.routing || typeof body.routing !== 'object') {
    return NextResponse.json({ error: 'Missing routing' }, { status: 400 })
  }

  const routing = await saveRouting(parseRouting(body.routing))
  await logAudit({ session, action: 'notifications.routing.update', entityType: 'notification_routing', metadata: { routing } })
  return NextResponse.json({ ok: true, routing })
}
