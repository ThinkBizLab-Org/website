import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import {
  articleSnapshotToUpdate,
  createArticleRevision,
  getArticleRevision,
  listArticleRevisions,
} from '@/lib/article-revisions'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin('viewer')
  if (response) return response

  const revisions = await listArticleRevisions(params.id)
  return NextResponse.json({ ok: true, revisions })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const revisionId = String(body.revisionId ?? '').trim()
  if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 })

  const [current] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
  if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  const revision = await getArticleRevision(revisionId)
  if (!revision || revision.articleId !== params.id) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

  await createArticleRevision({ article: current, action: 'restore', actorEmail: session?.user?.email })

  const [updated] = await db.update(articles)
    .set(articleSnapshotToUpdate(revision.snapshot))
    .where(eq(articles.id, params.id))
    .returning()

  await logAudit({
    session,
    action: 'article.revision.restore',
    entityType: 'article',
    entityId: params.id,
    metadata: { revisionId, version: revision.version },
  })

  return NextResponse.json({ ok: true, article: updated })
}
