import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { articles, mediaProductionQueue, type Article } from './schema'

export const MAX_MEDIA_PRODUCTION_ATTEMPTS = 5

export type MediaAssetType = 'cover_image' | 'instagram_image' | 'short_video'

export type MediaProductionPayload = {
  title?: string
  category?: string | null
  excerpt?: string | null
  keyPoints?: string[] | string | null
  prompt?: string | null
  script?: string | null
  // Hybrid short-video pipeline inputs (short_video only).
  videoPlan?: unknown
  videoFormat?: string | null
}

export type EnqueueMediaProductionJobInput = {
  articleId?: string | null
  assetType: MediaAssetType
  payload?: MediaProductionPayload
  scheduledAt?: Date
}

export function nextMediaProductionRetryAt(attempts: number, from = new Date()) {
  const minutes = attempts <= 1 ? 10 : attempts === 2 ? 30 : attempts === 3 ? 90 : attempts === 4 ? 240 : 720
  return new Date(from.getTime() + minutes * 60 * 1000)
}

export function shouldRetryMediaProductionFailure(attempts: number) {
  return attempts < MAX_MEDIA_PRODUCTION_ATTEMPTS
}

export function normalizeMediaAssetType(value: unknown): MediaAssetType | null {
  if (value === 'cover_image' || value === 'instagram_image' || value === 'short_video') return value
  return null
}

export async function enqueueMediaProductionJob({
  articleId = null,
  assetType,
  payload = {},
  scheduledAt = new Date(),
}: EnqueueMediaProductionJobInput) {
  if (articleId) {
    const [existing] = await db.select().from(mediaProductionQueue)
      .where(and(
        eq(mediaProductionQueue.articleId, articleId),
        eq(mediaProductionQueue.assetType, assetType),
        inArray(mediaProductionQueue.status, ['queued', 'processing', 'waiting']),
      ))
      .orderBy(desc(mediaProductionQueue.createdAt))
      .limit(1)

    if (existing) return { item: existing, created: false }
  }

  const [item] = await db.insert(mediaProductionQueue).values({
    articleId,
    assetType,
    status: 'queued',
    payload,
    attempts: 0,
    scheduledAt,
    updatedAt: new Date(),
  }).returning()

  return { item, created: true }
}

export async function buildMediaProductionPayload(assetType: MediaAssetType, article: Article, overrides: MediaProductionPayload = {}): Promise<MediaProductionPayload> {
  const keyPoints = article.keyPoints ?? []
  const prompt = assetType === 'short_video'
    ? article.ttVdoPrompt
    : assetType === 'instagram_image'
      ? article.igImagePrompt
      : ''

  return {
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    keyPoints,
    prompt,
    script: buildDefaultVideoScript(article),
    ...(assetType === 'short_video' ? { videoPlan: article.videoPlan, videoFormat: article.videoFormat } : {}),
    ...overrides,
  }
}

export async function getArticleForMediaProduction(articleId: string) {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1)
  return article ?? null
}

function buildDefaultVideoScript(article: Article) {
  const parts = [
    article.title,
    article.excerpt,
    ...(article.keyPoints ?? []).slice(0, 5),
  ].filter(Boolean)
  return parts.join('\n\n').slice(0, 1800)
}
