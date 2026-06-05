import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { socialPostQueue } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '').trim()
  const now = new Date()

  let update: Partial<typeof socialPostQueue.$inferInsert>
  if (action === 'retry') {
    update = { status: 'queued', error: null, scheduledAt: now, processedAt: null, updatedAt: now }
  } else if (action === 'cancel') {
    update = { status: 'cancelled', processedAt: now, updatedAt: now }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const [item] = await db.update(socialPostQueue)
    .set(update)
    .where(eq(socialPostQueue.id, params.id))
    .returning()

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAudit({
    session,
    action: `social_queue.${action}`,
    entityType: 'social_post_queue',
    entityId: item.id,
    metadata: { platform: item.platform, status: item.status },
  })

  return NextResponse.json({ ok: true, item })
}
