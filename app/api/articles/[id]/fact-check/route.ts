import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { runAndStoreFactCheck } from '@/lib/fact-check'

// Runs an on-demand AI fact-check pass over an article's current content and
// persists the result onto the article (same store the auto pass writes to).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'fact-check', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const [article] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  if (!article.content?.trim()) return NextResponse.json({ error: 'Article has no content to check' }, { status: 400 })

  const result = await runAndStoreFactCheck(article)
  if (!result) return NextResponse.json({ error: 'Fact-check failed' }, { status: 500 })

  await logAudit({
    session,
    action: 'article.fact_check',
    entityType: 'article',
    entityId: params.id,
    metadata: { summary: result.summary },
  })
  return NextResponse.json({ ok: true, ...result })
}
