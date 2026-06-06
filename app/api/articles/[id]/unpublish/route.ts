import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { canUnpublish, createArticleRevision } from '@/lib/article-revisions'

// Unpublish (rollback) a live article back to draft: it leaves the public site
// immediately (public queries filter status = 'published') while keeping its
// history. A revision snapshot is taken first so the published state can be
// restored from the revision history panel.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''

  const [current] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
  if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  if (!canUnpublish(current.status)) {
    return NextResponse.json({ error: 'Only published articles can be unpublished' }, { status: 400 })
  }

  await createArticleRevision({ article: current, action: 'unpublish', actorEmail: session?.user?.email })

  const [updated] = await db.update(articles)
    .set({ status: 'draft', publishScheduledAt: null, updatedAt: new Date() })
    .where(eq(articles.id, params.id))
    .returning()

  await logAudit({
    session,
    action: 'article.unpublish',
    entityType: 'article',
    entityId: params.id,
    metadata: { title: current.title, reason: reason || undefined },
  })

  return NextResponse.json({ ok: true, article: updated })
}
