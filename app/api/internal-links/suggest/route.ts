import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { suggestInternalLinks } from '@/lib/internal-links'
import { errorMessage, reportOperationalEvent } from '@/lib/monitoring'

export async function POST(req: Request) {
  const { response } = await requireAdmin('editor')
  if (response) return response

  try {
    const body = await req.json().catch(() => ({}))
    const candidates = await db.select().from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(120)

    const suggestions = suggestInternalLinks({
      articleId: String(body.articleId ?? '') || null,
      title: String(body.title ?? ''),
      content: String(body.content ?? ''),
      category: String(body.category ?? ''),
      tags: body.tags ?? '',
    }, candidates, 8)

    return NextResponse.json({ ok: true, suggestions })
  } catch (error) {
    await reportOperationalEvent({
      name: 'internal_links.suggest.failed',
      severity: 'warning',
      message: errorMessage(error),
    })
    return NextResponse.json({ error: 'Cannot suggest internal links' }, { status: 500 })
  }
}
