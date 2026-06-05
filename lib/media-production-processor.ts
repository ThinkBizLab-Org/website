import { and, eq, inArray, lte, or, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, mediaProductionQueue, type MediaProductionQueueItem } from './schema'
import { getSetting, getSettings } from './settings-store'
import { uploadToR2 } from './r2'
import { logAudit } from './audit'
import { errorMessage, reportOperationalEvent } from './monitoring'
import { nextMediaProductionRetryAt, shouldRetryMediaProductionFailure, type MediaAssetType, type MediaProductionPayload } from './media-production-queue'

type ProcessState =
  | { state: 'success'; url: string; key: string }
  | { state: 'waiting'; providerJobId: string; scheduledAt: Date; message: string }
  | { state: 'failed'; error: string }

export async function processMediaProductionQueue({ limit = 5, mode = 'cron' }: { limit?: number; mode?: 'cron' | 'manual' } = {}) {
  const now = new Date()
  const queued = await db.select().from(mediaProductionQueue)
    .where(and(
      inArray(mediaProductionQueue.status, ['queued', 'waiting']),
      or(lte(mediaProductionQueue.scheduledAt, now), sql`${mediaProductionQueue.scheduledAt} is null`),
    ))
    .orderBy(mediaProductionQueue.scheduledAt, mediaProductionQueue.createdAt)
    .limit(Math.max(1, Math.min(limit, 10)))

  const results = []
  for (const item of queued) results.push(await processMediaProductionQueueItem(item, mode))
  return { ok: true, processed: results.length, results }
}

async function processMediaProductionQueueItem(item: MediaProductionQueueItem, mode: 'cron' | 'manual') {
  const attempts = (item.attempts ?? 0) + 1
  await db.update(mediaProductionQueue).set({
    status: 'processing',
    attempts,
    error: null,
    updatedAt: new Date(),
  }).where(eq(mediaProductionQueue.id, item.id))

  let result: ProcessState
  try {
    result = await produceAsset({ ...item, attempts }, normalizePayload(item.payload))
  } catch (error) {
    result = { state: 'failed', error: errorMessage(error) }
  }

  if (result.state === 'waiting') {
    await db.update(mediaProductionQueue).set({
      status: 'waiting',
      providerJobId: result.providerJobId,
      error: result.message,
      scheduledAt: result.scheduledAt,
      updatedAt: new Date(),
    }).where(eq(mediaProductionQueue.id, item.id))
    return { id: item.id, assetType: item.assetType, articleId: item.articleId, status: 'waiting', providerJobId: result.providerJobId }
  }

  const shouldRetry = result.state === 'failed' && shouldRetryMediaProductionFailure(attempts)
  await db.update(mediaProductionQueue).set({
    status: result.state === 'success' ? 'success' : shouldRetry ? 'queued' : 'failed',
    resultUrl: result.state === 'success' ? result.url : item.resultUrl,
    resultKey: result.state === 'success' ? result.key : item.resultKey,
    error: result.state === 'failed' ? result.error : null,
    scheduledAt: shouldRetry ? nextMediaProductionRetryAt(attempts, new Date()) : item.scheduledAt,
    processedAt: result.state === 'success' || !shouldRetry ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(mediaProductionQueue.id, item.id))

  if (result.state === 'success') {
    await logAudit({
      actorEmail: mode === 'cron' ? 'media-production-cron' : 'media-production-manual',
      action: 'media_production.success',
      entityType: 'media_production_queue',
      entityId: item.id,
      metadata: { articleId: item.articleId, assetType: item.assetType, url: result.url },
    })
  } else {
    await reportOperationalEvent({
      name: 'media_production.process.failed',
      severity: 'warning',
      message: result.error,
      context: { queueId: item.id, articleId: item.articleId, assetType: item.assetType, attempts, retryScheduled: shouldRetry },
    })
  }

  return {
    id: item.id,
    assetType: item.assetType,
    articleId: item.articleId,
    ok: result.state === 'success',
    error: result.state === 'failed' ? result.error : undefined,
    retryScheduled: shouldRetry,
  }
}

function normalizePayload(payload: unknown): MediaProductionPayload {
  return payload && typeof payload === 'object' ? payload as MediaProductionPayload : {}
}

async function produceAsset(item: MediaProductionQueueItem, payload: MediaProductionPayload): Promise<ProcessState> {
  if (item.assetType === 'cover_image') return produceImage(item, payload, 'cover_image')
  if (item.assetType === 'instagram_image') return produceImage(item, payload, 'instagram_image')
  if (item.assetType === 'short_video') return produceVideo(item, payload)
  return { state: 'failed', error: `Unsupported asset type: ${item.assetType}` }
}

async function produceImage(item: MediaProductionQueueItem, payload: MediaProductionPayload, assetType: Extract<MediaAssetType, 'cover_image' | 'instagram_image'>): Promise<ProcessState> {
  const format = assetType === 'instagram_image' ? 'ig' : 'cover'
  const prompt = buildImagePrompt(payload, format)
  const image = await generateImage(prompt, format)
  const uploaded = await uploadToR2({
    body: image.buffer,
    filename: `${assetType}-${Date.now()}.jpg`,
    contentType: image.contentType,
    kind: assetType === 'instagram_image' ? 'generated-ig' : 'generated-cover',
  })

  if (item.articleId) {
    const field = assetType === 'instagram_image'
      ? { igImage: uploaded.url, updatedAt: new Date() }
      : { coverImage: uploaded.url, updatedAt: new Date() }
    await db.update(articles).set(field).where(eq(articles.id, item.articleId))
  }

  return { state: 'success', url: uploaded.url, key: uploaded.key }
}

async function produceVideo(item: MediaProductionQueueItem, payload: MediaProductionPayload): Promise<ProcessState> {
  const script = String(payload.script || payload.prompt || '').trim()
  if (!script) return { state: 'failed', error: 'Video script is empty' }

  if (!item.providerJobId) {
    const providerJobId = await submitHeyGenVideo(script)
    return {
      state: 'waiting',
      providerJobId,
      scheduledAt: new Date(Date.now() + 2 * 60 * 1000),
      message: 'Waiting for HeyGen video completion',
    }
  }

  const status = await pollHeyGenVideo(item.providerJobId)
  if (status.status === 'processing') {
    return {
      state: 'waiting',
      providerJobId: item.providerJobId,
      scheduledAt: new Date(Date.now() + 2 * 60 * 1000),
      message: 'HeyGen video still processing',
    }
  }
  if (status.status === 'failed') return { state: 'failed', error: status.error ?? 'HeyGen video generation failed' }

  const video = await fetchBinary(status.videoUrl, 'video/mp4')
  const uploaded = await uploadToR2({
    body: video.buffer,
    filename: `short-video-${Date.now()}.mp4`,
    contentType: video.contentType,
    kind: 'social-video',
  })

  if (item.articleId) {
    await db.update(articles).set({ ttVideoUrl: uploaded.url, igVideoUrl: uploaded.url, updatedAt: new Date() }).where(eq(articles.id, item.articleId))
  }

  return { state: 'success', url: uploaded.url, key: uploaded.key }
}

function buildImagePrompt(payload: MediaProductionPayload, format: 'cover' | 'ig') {
  const title = payload.title || 'ThinkBiz Lab'
  const category = payload.category || 'business'
  const excerpt = payload.excerpt ? `Context: ${payload.excerpt}.` : ''
  const keyPoints = Array.isArray(payload.keyPoints) ? payload.keyPoints.slice(0, 3).join(', ') : payload.keyPoints || ''
  const custom = payload.prompt ? `Additional direction: ${payload.prompt}.` : ''
  const aspect = format === 'ig' ? 'square 1:1 composition for Instagram' : 'wide 1200x630 editorial cover composition'
  return `Professional Thai business editorial image for "${title}". Category: ${category}. ${excerpt} Key ideas: ${keyPoints}. ${custom} ${aspect}. Photorealistic, clean business magazine style, natural lighting, sharp focus.`
}

async function generateImage(prompt: string, format: 'cover' | 'ig') {
  const falKey = await getFalKey()
  if (!falKey) throw new Error('FAL_KEY not configured')

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: format === 'ig' ? { width: 1080, height: 1080 } : { width: 1200, height: 630 },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    }),
  })
  if (!res.ok) throw new Error(`fal.ai error: ${await res.text()}`)
  const data = await res.json()
  const imageUrl = data?.images?.[0]?.url
  if (!imageUrl) throw new Error('No image returned from fal.ai')
  return fetchBinary(imageUrl, 'image/jpeg')
}

async function fetchBinary(url: string, fallbackContentType: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch generated asset: ${res.status}`)
  const contentType = res.headers.get('content-type') || fallbackContentType
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType }
}

async function getFalKey(): Promise<string> {
  try {
    const key = await getSetting('fal_api_key')
    if (key) return key
  } catch {
    // Optional setting; env fallback below.
  }
  return process.env.FAL_KEY ?? ''
}

async function getHeyGenConfig() {
  const map = await getSettings(['heygen_api_key', 'heygen_avatar_id', 'heygen_avatar_look_id', 'heygen_voice_id'])
  return {
    apiKey: map.heygen_api_key || process.env.HEYGEN_API_KEY || '',
    avatarId: map.heygen_avatar_id || process.env.HEYGEN_AVATAR_ID || '',
    avatarLookId: map.heygen_avatar_look_id || '',
    voiceId: map.heygen_voice_id || process.env.HEYGEN_VOICE_ID || '',
  }
}

async function submitHeyGenVideo(script: string) {
  const { apiKey, avatarId, avatarLookId, voiceId } = await getHeyGenConfig()
  if (!apiKey) throw new Error('HEYGEN_API_KEY not configured')
  if (!avatarId) throw new Error('HEYGEN_AVATAR_ID not configured')
  if (!voiceId) throw new Error('HEYGEN_VOICE_ID not configured')

  const character: Record<string, string> = { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' }
  if (avatarLookId) character.avatar_look_id = avatarLookId

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{ character, voice: { type: 'text', input_text: script, voice_id: voiceId, speed: 1.0 } }],
      dimension: { width: 1080, height: 1920 },
    }),
  })
  const data = await res.json() as { data?: { video_id?: string }; error?: { message?: string } }
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `HeyGen error ${res.status}`)
  const videoId = data.data?.video_id
  if (!videoId) throw new Error('HeyGen did not return video_id')
  return videoId
}

async function pollHeyGenVideo(videoId: string): Promise<{ status: 'processing' } | { status: 'failed'; error?: string } | { status: 'completed'; videoUrl: string }> {
  const { apiKey } = await getHeyGenConfig()
  if (!apiKey) throw new Error('HEYGEN_API_KEY not configured')

  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  const data = await res.json() as { data?: { status?: string; video_url?: string; error?: string } }
  const item = data.data
  if (item?.status === 'completed' && item.video_url) return { status: 'completed', videoUrl: item.video_url }
  if (item?.status === 'failed') return { status: 'failed', error: item.error }
  return { status: 'processing' }
}
