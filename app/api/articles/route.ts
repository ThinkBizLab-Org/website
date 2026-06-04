import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { calculateGEOScore } from '@/lib/geo-score'
import { estimateReadTime, generateSlug } from '@/lib/markdown'
import { requireAdmin } from '@/lib/api-auth'
import { articleInputSchema, validationError } from '@/lib/validators'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    if (status && status !== 'published') {
      const { response } = await requireAdmin('viewer')
      if (response) return response
    }
    const admin = await requireAdmin('viewer')
    const effectiveStatus = status ?? (admin.response ? 'published' : null)
    const all = await db.select().from(articles)
      .where(effectiveStatus ? eq(articles.status, effectiveStatus) : undefined)
      .orderBy(desc(articles.createdAt))
    return NextResponse.json(all)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'articles:create', limit: 60, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  try {
    const parsed = articleInputSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
    const body = parsed.data
    const slug = body.slug || generateSlug(body.title)
    const readTime = estimateReadTime(body.content ?? '')
    const geoScore = calculateGEOScore({
      content: body.content,
      excerpt: body.excerpt,
      aiSummaryQ: body.aiSummaryQ,
      aiSummaryA: body.aiSummaryA,
      keyPoints: body.keyPoints,
      faqJson: body.faqJson,
      schemaJson: body.schemaJson,
      tags: body.tags,
    })
    const now = new Date()

    const [article] = await db.insert(articles).values({
      ...body,
      slug,
      readTime,
      geoScore,
      publishScheduledAt: body.publishScheduledAt ? new Date(body.publishScheduledAt) : null,
      publishedAt: body.status === 'published' ? now : null,
      updatedAt: now,
    }).returning()

    await logAudit({
      session,
      action: 'article.create',
      entityType: 'article',
      entityId: article.id,
      metadata: { title: article.title, status: article.status },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
