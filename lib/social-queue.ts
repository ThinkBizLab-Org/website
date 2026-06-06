import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { socialPostQueue } from './schema'

export const MAX_SOCIAL_QUEUE_ATTEMPTS = 3

export type EnqueueSocialJobInput = {
  articleId: string
  platform: string
  payload: Record<string, unknown>
  scheduledAt?: Date
  force?: boolean
}

export function nextSocialRetryAt(attempts: number, from = new Date()) {
  const minutes = attempts <= 1 ? 15 : attempts === 2 ? 60 : 240
  return new Date(from.getTime() + minutes * 60 * 1000)
}

export function shouldRetrySocialQueueFailure(attempts: number) {
  return attempts < MAX_SOCIAL_QUEUE_ATTEMPTS
}

export async function enqueueSocialJob({ articleId, platform, payload, scheduledAt = new Date(), force = false }: EnqueueSocialJobInput) {
  // Evergreen re-shares pass force to bypass the de-dupe against already-posted jobs.
  if (!force) {
    const [existing] = await db.select().from(socialPostQueue)
      .where(and(
        eq(socialPostQueue.articleId, articleId),
        eq(socialPostQueue.platform, platform),
        inArray(socialPostQueue.status, ['queued', 'processing', 'success']),
      ))
      .orderBy(desc(socialPostQueue.createdAt))
      .limit(1)

    if (existing) return { item: existing, created: false }
  }

  const [item] = await db.insert(socialPostQueue).values({
    articleId,
    platform,
    status: 'queued',
    payload,
    attempts: 0,
    scheduledAt,
    updatedAt: new Date(),
  }).returning()

  return { item, created: true }
}

export async function recordSkippedSocialJob(articleId: string, platform: string, payload: Record<string, unknown>, error: string) {
  const [item] = await db.insert(socialPostQueue).values({
    articleId,
    platform,
    status: 'failed',
    payload,
    attempts: 0,
    error,
    scheduledAt: new Date(),
    processedAt: new Date(),
    updatedAt: new Date(),
  }).returning()

  return item
}
