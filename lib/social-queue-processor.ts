import { and, eq, lte, or, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, socialPostQueue, type SocialPostQueueItem } from './schema'
import { getSettings } from './settings-store'
import { logPublishAttempt } from './audit'
import { errorMessage, reportOperationalEvent } from './monitoring'
import { nextSocialRetryAt, shouldRetrySocialQueueFailure } from './social-queue'
import { recordDeadLetter } from './dead-letter-queue'
import { loadVideoPipelineConfig } from './video-pipeline-config'
import { socialPostMetrics } from './schema'
import { getLineAccessToken } from './line-token'
import { getTiktokAccessToken } from './tiktok-token'
import { publishTiktokVideo } from './tiktok-post'

type PublishResult = { ok: boolean; error?: string; externalId?: string }

type QueuePayload = {
  message?: string
  caption?: string
  hashtags?: string
  imageUrl?: string
  videoUrl?: string | null
}

export async function processSocialQueue({ limit = 10, mode = 'cron' }: { limit?: number; mode?: 'cron' | 'manual' } = {}) {
  const now = new Date()
  const queued = await db.select().from(socialPostQueue)
    .where(and(
      eq(socialPostQueue.status, 'queued'),
      or(lte(socialPostQueue.scheduledAt, now), sql`${socialPostQueue.scheduledAt} is null`),
    ))
    .orderBy(socialPostQueue.scheduledAt, socialPostQueue.createdAt)
    .limit(Math.max(1, Math.min(limit, 25)))

  const results = []
  for (const item of queued) {
    results.push(await processSocialQueueItem(item, mode))
  }

  return { ok: true, processed: results.length, results }
}

// Pure: a video post (TikTok, or an Instagram item carrying a video) must wait
// when approval is required and the article has not been signed off yet.
export function needsApprovalHold(input: { platform: string; hasVideo: boolean; requireApproval: boolean; approved: boolean }): boolean {
  if (!input.requireApproval || input.approved) return false
  return input.platform === 'tiktok' || (input.platform === 'instagram' && input.hasVideo)
}

async function shouldHoldForVideoApproval(item: SocialPostQueueItem): Promise<boolean> {
  const payload = normalizePayload(item.payload)
  const hasVideo = Boolean(payload.videoUrl)
  const isVideoPost = item.platform === 'tiktok' || (item.platform === 'instagram' && hasVideo)
  if (!isVideoPost || !item.articleId) return false

  const config = await loadVideoPipelineConfig()
  if (!config.requireApproval) return false

  const [row] = await db.select({ approvedAt: articles.videoApprovedAt }).from(articles).where(eq(articles.id, item.articleId)).limit(1)
  return needsApprovalHold({ platform: item.platform, hasVideo, requireApproval: true, approved: Boolean(row?.approvedAt) })
}

async function processSocialQueueItem(item: SocialPostQueueItem, mode: 'cron' | 'manual') {
  // Hold (do not consume an attempt) until the video is human-approved.
  if (await shouldHoldForVideoApproval(item)) {
    const retryAt = new Date(Date.now() + 30 * 60 * 1000)
    await db.update(socialPostQueue).set({
      status: 'queued',
      error: 'awaiting video approval',
      scheduledAt: retryAt,
      updatedAt: new Date(),
    }).where(eq(socialPostQueue.id, item.id))
    return { id: item.id, platform: item.platform, articleId: item.articleId, ok: false, held: true }
  }

  const attempts = (item.attempts ?? 0) + 1
  const now = new Date()
  await db.update(socialPostQueue).set({
    status: 'processing',
    attempts,
    error: null,
    updatedAt: now,
  }).where(eq(socialPostQueue.id, item.id))

  let result: PublishResult
  try {
    result = await publishPayload(item.platform, normalizePayload(item.payload))
  } catch (error) {
    result = { ok: false, error: errorMessage(error) }
  }

  const shouldRetry = !result.ok && shouldRetrySocialQueueFailure(attempts)
  await db.update(socialPostQueue).set({
    status: result.ok ? 'success' : shouldRetry ? 'queued' : 'failed',
    error: result.error ?? null,
    scheduledAt: shouldRetry ? nextSocialRetryAt(attempts, new Date()) : item.scheduledAt,
    processedAt: result.ok || !shouldRetry ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(socialPostQueue.id, item.id))

  if (result.ok && item.articleId) {
    // Seed a metrics row so the analytics cron can later fetch insights for this
    // post and feed real performance back into format learning.
    await db.insert(socialPostMetrics)
      .values({ platform: item.platform, articleId: item.articleId, postId: result.externalId ?? null })
      .catch(() => {})
  }

  if (item.articleId) {
    await syncArticlePlatformStatus(item.articleId, item.platform, result.ok)
    await logPublishAttempt({
      articleId: item.articleId,
      platform: item.platform,
      status: result.ok ? 'success' : 'failed',
      mode,
      error: result.error,
      metadata: { queueId: item.id, attempts },
    })
  }

  if (!result.ok) {
    await reportOperationalEvent({
      name: 'social_queue.process.failed',
      severity: 'warning',
      message: result.error ?? `Failed to publish ${item.platform}`,
      context: { queueId: item.id, articleId: item.articleId, platform: item.platform, attempts, retryScheduled: shouldRetry },
    })

    if (!shouldRetry) {
      await recordDeadLetter({
        source: 'social_post_queue',
        sourceId: item.id,
        articleId: item.articleId,
        reference: item.platform,
        payload: item.payload,
        attempts,
        error: result.error ?? `Failed to publish ${item.platform}`,
      })
    }
  }

  return { id: item.id, platform: item.platform, articleId: item.articleId, ok: result.ok, error: result.error, retryScheduled: shouldRetry }
}

function normalizePayload(payload: unknown): QueuePayload {
  return (payload && typeof payload === 'object') ? payload as QueuePayload : {}
}

async function publishPayload(platform: string, payload: QueuePayload): Promise<PublishResult> {
  if (platform === 'line') return sendLine(payload.message ?? payload.caption ?? '')
  if (platform === 'facebook') return postFacebook(payload.caption ?? '', payload.hashtags ?? '')
  if (platform === 'instagram') return postInstagram(payload.caption ?? '', payload.hashtags ?? '', payload.imageUrl ?? '', payload.videoUrl)
  if (platform === 'tiktok') {
    if (!payload.videoUrl) return { ok: false, error: 'no video URL' }
    return postTikTok(payload.caption ?? '', payload.hashtags ?? '', payload.videoUrl)
  }
  return { ok: false, error: `Unsupported platform: ${platform}` }
}

async function syncArticlePlatformStatus(articleId: string, platform: string, ok: boolean) {
  const now = new Date()
  if (platform === 'line') {
    await db.update(articles).set({ lineBroadcastSent: ok, lineBroadcastAt: ok ? now : undefined }).where(eq(articles.id, articleId))
  } else if (platform === 'facebook') {
    await db.update(articles).set({ fbSent: ok, fbSentAt: ok ? now : undefined }).where(eq(articles.id, articleId))
  } else if (platform === 'instagram') {
    await db.update(articles).set({ igSent: ok, igSentAt: ok ? now : undefined }).where(eq(articles.id, articleId))
  } else if (platform === 'tiktok') {
    await db.update(articles).set({ ttSent: ok, ttSentAt: ok ? now : undefined }).where(eq(articles.id, articleId))
  }
}

async function sendLine(message: string): Promise<PublishResult> {
  const token = await getLineAccessToken()
  if (!token) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }
  if (!message.trim()) return { ok: false, error: 'LINE message is empty' }
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) return { ok: false, error: JSON.stringify(await res.json().catch(() => ({ status: res.status }))) }
  return { ok: true }
}

async function postFacebook(caption: string, hashtags: string): Promise<PublishResult> {
  const fbMap = await getSettings(['fb_page_access_token', 'fb_page_id'])
  const token = fbMap['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN
  const pageId = fbMap['fb_page_id'] || process.env.FB_PAGE_ID
  if (!token || !pageId) return { ok: false, error: 'FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID not set' }
  if (!caption.trim()) return { ok: false, error: 'Facebook caption is empty' }
  const message = hashtags ? `${caption}\n\n${hashtags}` : caption
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: token }),
  })
  if (!res.ok) return { ok: false, error: JSON.stringify(await res.json().catch(() => ({ status: res.status }))) }
  const data = await res.json().catch(() => ({} as { id?: string }))
  return { ok: true, externalId: data.id }
}

// Instagram media containers — Reels especially — must finish processing the
// fetched video before they can be published. Publishing too early returns
// error 9007 "Media ID is not available". Classify the container's status_code
// so the publish step can wait for a FINISHED container.
export function igContainerOutcome(statusCode: string | undefined | null): 'ready' | 'failed' | 'pending' {
  if (statusCode === 'FINISHED') return 'ready'
  if (statusCode === 'ERROR' || statusCode === 'EXPIRED') return 'failed'
  return 'pending' // IN_PROGRESS / PUBLISHED / unknown → keep waiting
}

// Poll an IG media container until it is ready to publish. Bounded so a single
// queue item never blocks the cron for long; on timeout it returns a retryable
// error and the social queue retries the whole post on a later tick.
async function waitForIgContainer(creationId: string, token: string): Promise<PublishResult> {
  const maxAttempts = 20
  const intervalMs = 3000 // ~60s budget — enough for short-form Reels to transcode
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`)
    const data = await res.json().catch(() => ({}) as { status_code?: string; status?: string })
    const outcome = igContainerOutcome(data.status_code)
    if (outcome === 'ready') return { ok: true }
    if (outcome === 'failed') return { ok: false, error: `IG container ${data.status_code}: ${data.status ?? ''}`.trim() }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return { ok: false, error: 'IG container still processing (not FINISHED in time) — will retry' }
}

async function postInstagram(caption: string, hashtags: string, imageUrl: string, videoUrl?: string | null): Promise<PublishResult> {
  const igMap = await getSettings(['fb_page_access_token', 'ig_user_id'])
  const token = igMap['fb_page_access_token'] || process.env.FB_PAGE_ACCESS_TOKEN
  const igUserId = igMap['ig_user_id'] || process.env.IG_USER_ID
  if (!token || !igUserId) return { ok: false, error: 'FB_PAGE_ACCESS_TOKEN or IG_USER_ID not set' }

  const text = hashtags ? `${caption}\n\n${hashtags}` : caption
  if (!text.trim()) return { ok: false, error: 'Instagram caption is empty' }

  if (videoUrl) {
    const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption: text, share_to_feed: true, access_token: token }),
    })
    if (!createRes.ok) return { ok: false, error: JSON.stringify(await createRes.json().catch(() => ({ status: createRes.status }))) }
    const { id: creationId } = await createRes.json()
    // Reels need processing time — wait for the container before publishing (else error 9007).
    const ready = await waitForIgContainer(creationId, token)
    if (!ready.ok) return ready
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) return { ok: false, error: JSON.stringify(await publishRes.json().catch(() => ({ status: publishRes.status }))) }
    const pub = await publishRes.json().catch(() => ({} as { id?: string }))
    return { ok: true, externalId: pub.id }
  }

  if (!imageUrl) return { ok: false, error: 'Instagram requires a cover image or video' }
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: token }),
  })
  if (!createRes.ok) return { ok: false, error: JSON.stringify(await createRes.json().catch(() => ({ status: createRes.status }))) }
  const { id: creationId } = await createRes.json()
  const ready = await waitForIgContainer(creationId, token)
  if (!ready.ok) return ready
  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  })
  if (!publishRes.ok) return { ok: false, error: JSON.stringify(await publishRes.json().catch(() => ({ status: publishRes.status }))) }
  const pub = await publishRes.json().catch(() => ({} as { id?: string }))
  return { ok: true, externalId: pub.id }
}

async function postTikTok(caption: string, hashtags: string, videoUrl: string): Promise<PublishResult> {
  const token = await getTiktokAccessToken()
  if (!token) return { ok: false, error: 'TikTok token not found or refresh failed' }
  const text = hashtags ? `${caption} ${hashtags}` : caption
  if (!text.trim()) return { ok: false, error: 'TikTok caption is empty' }
  // Request public for automated posts; publishTiktokVideo clamps to SELF_ONLY
  // until the app is audited, so this is safe pre-approval.
  const result = await publishTiktokVideo(token, videoUrl, text, { privacyLevel: 'PUBLIC_TO_EVERYONE' })
  return result.ok ? { ok: true, externalId: result.publishId } : { ok: false, error: result.error }
}
