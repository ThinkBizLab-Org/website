import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { articles } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { createArticlePreviewToken } from '@/lib/preview-token'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin()
  if (response) return response

  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, params.id))
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = createArticlePreviewToken(params.id)
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  const url = `${base}/preview/articles/${params.id}?token=${encodeURIComponent(token)}`

  await logAudit({
    session,
    action: 'article.preview_token.create',
    entityType: 'article',
    entityId: params.id,
  })

  return NextResponse.json({ url, expiresInSeconds: 3600 })
}
