import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mediaProductionQueue } from '@/lib/schema'
import { requireAdmin } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import {
  buildMediaProductionPayload,
  enqueueMediaProductionJob,
  getArticleForMediaProduction,
  normalizeMediaAssetType,
  type MediaProductionPayload,
} from '@/lib/media-production-queue'

export async function GET() {
  const { response } = await requireAdmin('editor')
  if (response) return response

  const rows = await db.select().from(mediaProductionQueue).orderBy(desc(mediaProductionQueue.createdAt)).limit(200)
  return NextResponse.json({ ok: true, queue: rows })
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin('editor')
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const articleId = String(body.articleId ?? '').trim() || null
  const assetType = normalizeMediaAssetType(body.assetType)
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : undefined
  if (!assetType) return NextResponse.json({ error: 'Invalid assetType' }, { status: 400 })

  let payload = (body.payload && typeof body.payload === 'object' ? body.payload : {}) as MediaProductionPayload
  if (articleId) {
    const article = await getArticleForMediaProduction(articleId)
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    payload = await buildMediaProductionPayload(assetType, article, payload)
  }

  const result = await enqueueMediaProductionJob({ articleId, assetType, payload, scheduledAt })

  await logAudit({
    session,
    action: result.created ? 'media_production.create' : 'media_production.duplicate_guard',
    entityType: 'media_production_queue',
    entityId: result.item.id,
    metadata: { articleId, assetType, created: result.created },
  })

  return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 })
}
