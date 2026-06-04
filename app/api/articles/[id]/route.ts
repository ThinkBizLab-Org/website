import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { calculateGEOScore } from '@/lib/geo-score'
import { estimateReadTime } from '@/lib/markdown'
import { requireAdmin } from '@/lib/api-auth'
import { articleInputSchema, articlePatchSchema, validationError } from '@/lib/validators'
import { rateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const [article] = await db.select().from(articles).where(eq(articles.id, params.id))
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (article.status !== 'published') {
      const { response } = await requireAdmin('viewer')
      if (response) return response
    }
    return NextResponse.json(article)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'articles:update', limit: 120, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  try {
    const parsed = articleInputSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
    const body = parsed.data
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
    const readTime = estimateReadTime(body.content ?? '')
    const now = new Date()

    const [updated] = await db.update(articles)
      .set({
        ...body,
        geoScore,
        readTime,
        publishScheduledAt: body.publishScheduledAt ? new Date(body.publishScheduledAt) : null,
        publishedAt: body.status === 'published' ? now : null,
        updatedAt: now,
      })
      .where(eq(articles.id, params.id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logAudit({
      session,
      action: 'article.update',
      entityType: 'article',
      entityId: updated.id,
      metadata: { title: updated.title, status: updated.status },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const limited = rateLimit(req, { key: 'articles:patch', limit: 240, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  try {
    const parsed = articlePatchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 })
    const body = parsed.data
    const allowed = ['coverImage', 'igImage', 'igImagePrompt', 'igVideoUrl'] as const
    const updates: Partial<Record<typeof allowed[number], string>> = {}
    for (const key of allowed) {
      if (key in body && body[key] !== undefined && body[key] !== null) updates[key] = body[key] ?? ''
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    const [updated] = await db.update(articles).set({ ...updates, updatedAt: new Date() }).where(eq(articles.id, params.id)).returning()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await logAudit({
      session,
      action: 'article.patch',
      entityType: 'article',
      entityId: updated.id,
      metadata: { fields: Object.keys(updates) },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('admin')
  if (response) return response

  try {
    await db.delete(articles).where(eq(articles.id, params.id))
    await logAudit({
      session,
      action: 'article.delete',
      entityType: 'article',
      entityId: params.id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
