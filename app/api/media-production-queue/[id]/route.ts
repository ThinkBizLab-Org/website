import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { mediaProductionQueue } from '@/lib/schema'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')
  const now = new Date()

  if (action === 'retry') {
    const [item] = await db.update(mediaProductionQueue).set({
      status: 'queued',
      error: null,
      scheduledAt: now,
      processedAt: null,
      updatedAt: now,
    }).where(eq(mediaProductionQueue.id, params.id)).returning()
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logAudit({ session, action: 'media_production.retry', entityType: 'media_production_queue', entityId: item.id })
    return NextResponse.json({ ok: true, item })
  }

  if (action === 'cancel') {
    const [item] = await db.update(mediaProductionQueue).set({
      status: 'cancelled',
      processedAt: now,
      updatedAt: now,
    }).where(eq(mediaProductionQueue.id, params.id)).returning()
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logAudit({ session, action: 'media_production.cancel', entityType: 'media_production_queue', entityId: item.id })
    return NextResponse.json({ ok: true, item })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
