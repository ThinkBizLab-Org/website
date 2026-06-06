import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'

// Human sign-off for a rendered video before the social queue auto-posts it.
// POST = approve, DELETE = revoke approval. Gated on the `editor` role.

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const actor = session.user?.email ?? null
  const now = new Date()
  const [updated] = await db.update(articles)
    .set({ videoApprovedAt: now, videoApprovedBy: actor, updatedAt: now })
    .where(eq(articles.id, params.id))
    .returning({ id: articles.id })
  if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  await logAudit({ actorEmail: actor, action: 'video.approve', entityType: 'article', entityId: params.id })
  return NextResponse.json({ ok: true, approvedAt: now, approvedBy: actor })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const actor = session.user?.email ?? null
  const [updated] = await db.update(articles)
    .set({ videoApprovedAt: null, videoApprovedBy: null, updatedAt: new Date() })
    .where(eq(articles.id, params.id))
    .returning({ id: articles.id })
  if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  await logAudit({ actorEmail: actor, action: 'video.unapprove', entityType: 'article', entityId: params.id })
  return NextResponse.json({ ok: true, approvedAt: null })
}
