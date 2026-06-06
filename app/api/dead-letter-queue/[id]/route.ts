import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { normalizeDeadLetterAction, resolveDeadLetter } from '@/lib/dead-letter-queue'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const action = normalizeDeadLetterAction(body.action)
  if (!action) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const result = await resolveDeadLetter({ id: params.id, action, actorEmail: session.user?.email })
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 409
    return NextResponse.json({ error: result.error === 'not_found' ? 'Not found' : 'Already resolved' }, { status })
  }

  await logAudit({
    session,
    action: action === 'requeue' ? 'dead_letter.requeue' : 'dead_letter.discard',
    entityType: 'dead_letter_queue',
    entityId: result.item.id,
    metadata: { source: result.item.source, sourceId: result.item.sourceId, requeued: result.requeued },
  })

  return NextResponse.json({ ok: true, item: result.item, requeued: result.requeued })
}
