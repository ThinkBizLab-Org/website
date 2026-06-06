import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { getArticleRevision } from '@/lib/article-revisions'
import { DIFF_FIELDS, diffLines, diffSnapshots, summarizeLineDiff } from '@/lib/article-diff'

// Diffs one revision against another revision or the current article. `to`
// defaults to the live article, so the common "what changed since vN" view is
// just ?from=<revisionId>.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin('viewer')
  if (response) return response

  const { searchParams } = new URL(req.url)
  const fromId = String(searchParams.get('from') ?? '').trim()
  const toId = String(searchParams.get('to') ?? '').trim()
  if (!fromId) return NextResponse.json({ error: 'from revision is required' }, { status: 400 })

  const fromRevision = await getArticleRevision(fromId)
  if (!fromRevision || fromRevision.articleId !== params.id) {
    return NextResponse.json({ error: 'from revision not found' }, { status: 404 })
  }

  let toSnapshot: unknown
  let toLabel: string
  if (!toId || toId === 'current') {
    const [current] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
    if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    toSnapshot = current
    toLabel = 'current'
  } else {
    const toRevision = await getArticleRevision(toId)
    if (!toRevision || toRevision.articleId !== params.id) {
      return NextResponse.json({ error: 'to revision not found' }, { status: 404 })
    }
    toSnapshot = toRevision.snapshot
    toLabel = `v${toRevision.version}`
  }

  const fields = diffSnapshots(fromRevision.snapshot, toSnapshot, DIFF_FIELDS)
  const before = fields.find(field => field.field === 'content')?.before ?? ''
  const after = fields.find(field => field.field === 'content')?.after ?? ''
  const contentDiff = diffLines(before, after).slice(0, 800)

  return NextResponse.json({
    ok: true,
    from: `v${fromRevision.version}`,
    to: toLabel,
    fields,
    contentDiff,
    contentSummary: summarizeLineDiff(diffLines(before, after)),
  })
}
