import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { normalizeLeadStatus } from '@/lib/leads'
import { logAudit } from '@/lib/audit'

// Admin: advance a lead through the pipeline (new → contacted → … → won/lost).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const status = normalizeLeadStatus(body.status)
  if (!status) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const [updated] = await db.update(leads)
    .set({ status, updatedAt: new Date() })
    .where(eq(leads.id, params.id))
    .returning({ id: leads.id })
  if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  await logAudit({ actorEmail: session.user?.email ?? null, action: 'lead.status', entityType: 'lead', entityId: params.id, metadata: { status } })
  return NextResponse.json({ ok: true, status })
}
