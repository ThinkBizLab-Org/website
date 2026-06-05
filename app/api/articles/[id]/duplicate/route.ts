import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { createArticleRevision } from '@/lib/article-revisions'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  try {
    const [source] = await db.select().from(articles).where(eq(articles.id, params.id)).limit(1)
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date()
    const copySuffix = Date.now().toString(36)
    const [article] = await db.insert(articles).values({
      title: `${source.title} (Copy)`,
      slug: `${source.slug}-copy-${copySuffix}`,
      excerpt: source.excerpt,
      content: source.content,
      coverImage: source.coverImage,
      category: source.category,
      tags: source.tags,
      status: 'draft',
      aiSummaryQ: source.aiSummaryQ,
      aiSummaryA: source.aiSummaryA,
      keyPoints: source.keyPoints,
      faqJson: source.faqJson,
      schemaJson: source.schemaJson,
      geoScore: source.geoScore,
      readTime: source.readTime,
      featured: false,
      publishScheduledAt: null,
      lineBroadcastMsg: source.lineBroadcastMsg,
      lineBroadcastSent: false,
      lineBroadcastAt: null,
      fbSent: false,
      fbSentAt: null,
      ttSent: false,
      ttSentAt: null,
      igSent: false,
      igSentAt: null,
      fbCaption: source.fbCaption,
      fbHashtags: source.fbHashtags,
      ttCaption: source.ttCaption,
      ttHashtags: source.ttHashtags,
      ttVideoUrl: source.ttVideoUrl,
      ttVdoPrompt: source.ttVdoPrompt,
      igCaption: source.igCaption,
      igHashtags: source.igHashtags,
      igVideoUrl: source.igVideoUrl,
      igImagePrompt: source.igImagePrompt,
      igImage: source.igImage,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    }).returning()

    await createArticleRevision({ article, action: 'create', actorEmail: session?.user?.email })
    await logAudit({
      session,
      action: 'article.duplicate',
      entityType: 'article',
      entityId: article.id,
      metadata: { sourceArticleId: source.id, title: article.title },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
