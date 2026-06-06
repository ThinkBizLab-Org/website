import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { errorMessage } from '@/lib/monitoring'
import { runFactCheck } from '@/lib/fact-check'

// Runs an on-demand AI fact-check pass over an article's current content.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'fact-check', limit: 30, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const [article] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  if (!article.content?.trim()) return NextResponse.json({ error: 'Article has no content to check' }, { status: 400 })

  try {
    const result = await runFactCheck(article.title, article.content)
    await logAudit({
      session,
      action: 'article.fact_check',
      entityType: 'article',
      entityId: params.id,
      metadata: { summary: result.summary },
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
