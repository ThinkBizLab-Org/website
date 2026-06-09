import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { articles, socialPostQueue } from './schema'

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

// The article fields needed to decide which video social posts to (re-)enqueue.
export type VideoPostArticle = {
  status: string | null
  publishedAt: Date | null
  ttCaption: string | null
  ttHashtags: string | null
  ttVideoUrl: string | null
  ttSent: boolean | null
  igCaption: string | null
  igHashtags: string | null
  igVideoUrl: string | null
  igImage: string | null
  coverImage: string | null
  igSent: boolean | null
}

// Pure: which video posts to (re-)enqueue once a short-video is available for an
// article. Only for already-published articles — before publish, the publish
// cron enqueues at publish time with the (now-present) video URL, so acting
// earlier would duplicate. Instagram is taken here only when it carries a video
// (a Reel); image-only IG stays the publish cron's job. De-duping against
// existing queued/processing/success rows is left to enqueueSocialJob, so a
// previously "skipped" (status='failed') TikTok row does not block a fresh one.
export function videoPostsToEnqueue(a: VideoPostArticle): { platform: 'tiktok' | 'instagram'; payload: Record<string, unknown> }[] {
  const isPublished = a.status === 'published' || a.publishedAt != null
  if (!isPublished) return []

  const jobs: { platform: 'tiktok' | 'instagram'; payload: Record<string, unknown> }[] = []
  if (a.ttCaption && a.ttVideoUrl && !a.ttSent) {
    jobs.push({ platform: 'tiktok', payload: { caption: a.ttCaption, hashtags: a.ttHashtags ?? '', videoUrl: a.ttVideoUrl } })
  }
  if (a.igCaption && a.igVideoUrl && !a.igSent) {
    jobs.push({ platform: 'instagram', payload: { caption: a.igCaption, hashtags: a.igHashtags ?? '', imageUrl: a.igImage || a.coverImage || '', videoUrl: a.igVideoUrl } })
  }
  return jobs
}

// (Re-)enqueue the TikTok/Instagram video posts for an article once its
// short-video has been rendered/attached or approved. Closes the gap where an
// article published before its video was ready had TikTok skipped ("no video
// URL") at publish time and never re-enqueued. Idempotent via enqueueSocialJob's
// de-dupe; the social-queue's video-approval gate still holds posts until
// approval. Returns the platforms for which a new job was actually created.
export async function enqueueVideoPostsForArticle(articleId: string): Promise<{ created: string[] }> {
  const [a] = await db.select({
    status: articles.status,
    publishedAt: articles.publishedAt,
    ttCaption: articles.ttCaption,
    ttHashtags: articles.ttHashtags,
    ttVideoUrl: articles.ttVideoUrl,
    ttSent: articles.ttSent,
    igCaption: articles.igCaption,
    igHashtags: articles.igHashtags,
    igVideoUrl: articles.igVideoUrl,
    igImage: articles.igImage,
    coverImage: articles.coverImage,
    igSent: articles.igSent,
  }).from(articles).where(eq(articles.id, articleId)).limit(1)
  if (!a) return { created: [] }

  const created: string[] = []
  for (const job of videoPostsToEnqueue(a)) {
    const res = await enqueueSocialJob({ articleId, platform: job.platform, payload: job.payload })
    if (res.created) created.push(job.platform)
  }
  return { created }
}
