import { and, eq, inArray, lte, or, sql } from 'drizzle-orm'
import { db } from './db'
import { articles, mediaProductionQueue, type MediaProductionQueueItem } from './schema'
import { getSetting, getSettings } from './settings-store'
import { uploadToR2 } from './r2'
import { logAudit } from './audit'
import { errorMessage, reportOperationalEvent } from './monitoring'
import { nextMediaProductionRetryAt, shouldRetryMediaProductionFailure, type MediaAssetType, type MediaProductionPayload } from './media-production-queue'
import { recordDeadLetter } from './dead-letter-queue'
import { loadVideoPipelineConfig, type VideoPipelineConfig } from './video-pipeline-config'
import { getOrBuildVideoPlan, resolveVideoPlan, type RouteContext, type RoutedVideoPlan } from './video-router'
import { getLearnedFormatWeights, pickWeightedFormat } from './video-format-learning'
import { buildRemotionInputProps, clampScriptToSeconds, estimateSpeechSeconds, isVideoProgress, reconcileSceneDurations, scenesNeedingBackground, type VideoProgress } from './video-pipeline'

// Keep HeyGen talking-head shorts within the Reels/TikTok sweet spot.
const HEYGEN_MAX_SCRIPT_SECONDS = 45
import { getBudgetStatus } from './ai-budget'
import { synthesizeVoiceover } from './tts'
import { pollRemotionRender, submitRemotionRender } from './remotion-render'
import { estimateImageCostUsd, estimateTtsCostUsd, estimateVideoCostUsd, recordMediaUsage } from './ai-usage'
import { maybeNotifyVideoApproval } from './video-approval'

const BROLL_CLIP_SECONDS = 5

type ProcessState =
  | { state: 'success'; url: string; key: string }
  | { state: 'waiting'; providerJobId: string; scheduledAt: Date; message: string; stage?: string; progress?: VideoProgress }
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
      stage: result.stage ?? null,
      progress: result.progress ?? null,
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

    if (!shouldRetry) {
      await recordDeadLetter({
        source: 'media_production_queue',
        sourceId: item.id,
        articleId: item.articleId,
        reference: item.assetType,
        payload: item.payload,
        attempts,
        error: result.error,
      })
    }
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
  if (item.assetType === 'short_video') return produceVideoRouted(item, payload)
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

  await recordMediaUsage({ kind: 'image', model: 'fal-ai/flux/schnell', costUsd: estimateImageCostUsd(1), articleId: item.articleId })
  return { state: 'success', url: uploaded.url, key: uploaded.key }
}

// Routes a short_video job: when the hybrid pipeline is disabled (or set to
// heygen, or the resolved format is talking_head) it uses the original HeyGen
// path untouched; otherwise it runs the multi-stage Remotion pipeline.
async function produceVideoRouted(item: MediaProductionQueueItem, payload: MediaProductionPayload): Promise<ProcessState> {
  const config = await loadVideoPipelineConfig()
  if (!config.enabled || config.engine === 'heygen') return produceVideoHeyGen(item, payload)

  // Learned exploration: bias the fallback format toward what performs, while
  // still trying all formats. Only used when there is no AI plan / manual override.
  const formatWeights = await getLearnedFormatWeights().catch(() => ({}))
  const fallbackFormat = Object.keys(formatWeights).length ? pickWeightedFormat(formatWeights) : null

  const plan = getOrBuildVideoPlan({
    videoPlan: payload.videoPlan,
    videoFormat: payload.videoFormat,
    title: payload.title ?? '',
    excerpt: payload.excerpt ?? null,
    keyPoints: Array.isArray(payload.keyPoints) ? payload.keyPoints : typeof payload.keyPoints === 'string' ? [payload.keyPoints] : null,
    category: payload.category ?? null,
    allowTalkingHead: config.allowTalkingHead,
    fallbackFormat,
  })
  if (plan.format === 'talking_head') return produceVideoHeyGen(item, payload)

  const budget = await getBudgetStatus().catch(() => null)
  const ctx: RouteContext = {
    maxBrollScenes: config.maxBrollScenes,
    maxDurationSec: config.maxDurationSec,
    minDurationSec: config.minDurationSec,
    budgetExceeded: budget?.exceeded ?? false,
  }
  let routed = resolveVideoPlan(plan, ctx)
  // Reconcile scene timing with the narration length so the video is not shorter
  // than the voiceover (capped at maxDurationSec).
  if (config.ttsProvider !== 'none' && routed.voiceover && routed.voiceoverScript) {
    const voiceSeconds = estimateSpeechSeconds(routed.voiceoverScript)
    routed = {
      ...routed,
      scenes: reconcileSceneDurations(routed.scenes, voiceSeconds, config.maxDurationSec),
      durationSec: Math.min(config.maxDurationSec, Math.max(routed.durationSec, voiceSeconds)),
    }
  }

  const progress: VideoProgress = isVideoProgress(item.progress) ? item.progress : { stage: 'assets' }

  if (progress.stage === 'render') return runRenderStage(routed, progress, item.articleId)
  return runAssetsStage(routed, progress, config, item.articleId)
}

// Stage 1: generate each scene's background (flux still / fal-video B-roll) and
// the voiceover, then hand off to the render stage. B-roll clips are async, so
// the job waits across cron cycles until they complete.
async function runAssetsStage(routed: RoutedVideoPlan, progress: VideoProgress, config: VideoPipelineConfig, articleId: string | null): Promise<ProcessState> {
  const sceneBgUrls: Record<number, string> = { ...(progress.sceneBgUrls ?? {}) }
  const pendingBroll: Record<number, string> = { ...(progress.pendingBroll ?? {}) }

  // Resume: collect any B-roll clips that finished since the last cycle.
  for (const [indexStr, statusUrl] of Object.entries(pendingBroll)) {
    const index = Number(indexStr)
    const status = await pollFalVideo(statusUrl)
    if (status.status === 'processing') {
      return waitingAssets(sceneBgUrls, pendingBroll, progress.voiceUrl)
    }
    if (status.status === 'failed') return { state: 'failed', error: status.error ?? 'B-roll generation failed' }
    const uploaded = await downloadToR2(status.videoUrl, 'video/mp4', 'social-video', `broll-${index}`)
    sceneBgUrls[index] = uploaded.url
    delete pendingBroll[index]
    await recordMediaUsage({ kind: 'video', model: 'fal-broll', costUsd: estimateVideoCostUsd(BROLL_CLIP_SECONDS), articleId })
  }

  // Generate any backgrounds not yet resolved.
  for (const { index, scene } of scenesNeedingBackground(routed)) {
    if (sceneBgUrls[index] || pendingBroll[index]) continue
    if (scene.source === 'flux') {
      const image = await generateSceneImage(scene.bgPrompt || scene.text || 'editorial business backdrop')
      const uploaded = await uploadToR2({ body: image.buffer, filename: `scene-${index}-${Date.now()}.jpg`, contentType: image.contentType, kind: 'generated-ig' })
      sceneBgUrls[index] = uploaded.url
      await recordMediaUsage({ kind: 'image', model: 'fal-ai/flux/schnell', costUsd: estimateImageCostUsd(1), articleId })
    } else if (scene.source === 'fal-video') {
      pendingBroll[index] = await submitFalVideo(scene.bgPrompt || scene.text || 'cinematic business b-roll', scene.model || config.brollModel)
    }
  }

  if (Object.keys(pendingBroll).length > 0) return waitingAssets(sceneBgUrls, pendingBroll, progress.voiceUrl)

  // Voiceover (optional). A TTS failure must NOT sink the whole video — fall back
  // to a silent render that still shows the on-screen scene text.
  let voiceUrl = progress.voiceUrl
  let captionTimings = progress.captionTimings
  if (routed.voiceover && !voiceUrl && config.ttsProvider !== 'none' && routed.voiceoverScript) {
    try {
      const audio = await synthesizeVoiceover(routed.voiceoverScript, config.ttsProvider)
      const uploaded = await uploadToR2({ body: audio.buffer, filename: `voice-${Date.now()}.mp3`, contentType: audio.contentType, kind: 'social-video' })
      voiceUrl = uploaded.url
      captionTimings = audio.captions
      await recordMediaUsage({ kind: 'tts', model: config.ttsProvider, costUsd: estimateTtsCostUsd(routed.voiceoverScript.length), articleId })
    } catch (error) {
      await reportOperationalEvent({
        name: 'media_production.tts.failed',
        severity: 'warning',
        message: errorMessage(error),
        context: { articleId, provider: config.ttsProvider },
      })
      // Continue without voiceover.
    }
  }

  return runRenderStage(routed, { stage: 'render', sceneBgUrls, voiceUrl, captionTimings }, articleId)
}

// Stage 2: submit the composition to Remotion Lambda and poll until done.
async function runRenderStage(routed: RoutedVideoPlan, progress: VideoProgress, articleId: string | null): Promise<ProcessState> {
  if (!progress.renderId) {
    const inputProps = buildRemotionInputProps(routed, { sceneBgUrls: progress.sceneBgUrls, voiceUrl: progress.voiceUrl, captionTimings: progress.captionTimings })
    const submit = await submitRemotionRender(inputProps)
    return {
      state: 'waiting',
      providerJobId: submit.renderId,
      scheduledAt: new Date(Date.now() + 60 * 1000),
      message: 'Rendering video (Remotion Lambda)',
      stage: 'render',
      progress: { ...progress, stage: 'render', renderId: submit.renderId, renderBucket: submit.bucketName },
    }
  }

  const status = await pollRemotionRender(progress.renderId, progress.renderBucket ?? '')
  if (status.status === 'processing') {
    return {
      state: 'waiting',
      providerJobId: progress.renderId,
      scheduledAt: new Date(Date.now() + 60 * 1000),
      message: `Rendering video ${Math.round(status.progress * 100)}%`,
      stage: 'render',
      progress: { ...progress, stage: 'render' },
    }
  }
  if (status.status === 'error') return { state: 'failed', error: status.error }

  // Stage 3: finalize — pull the rendered mp4 into R2 and attach to the article.
  const uploaded = await downloadToR2(status.outputUrl, 'video/mp4', 'social-video', 'short-video')
  if (articleId) {
    await db.update(articles).set({ ttVideoUrl: uploaded.url, igVideoUrl: uploaded.url, videoFormatUsed: routed.format, updatedAt: new Date() }).where(eq(articles.id, articleId))
    await maybeNotifyVideoApproval(articleId, routed.format)
  }
  return { state: 'success', url: uploaded.url, key: uploaded.key }
}

function waitingAssets(sceneBgUrls: Record<number, string>, pendingBroll: Record<number, string>, voiceUrl?: string): ProcessState {
  return {
    state: 'waiting',
    providerJobId: 'broll',
    scheduledAt: new Date(Date.now() + 90 * 1000),
    message: 'Generating B-roll clips',
    stage: 'assets',
    progress: { stage: 'assets', sceneBgUrls, pendingBroll, voiceUrl },
  }
}

// Original HeyGen talking-head path — unchanged behaviour.
async function produceVideoHeyGen(item: MediaProductionQueueItem, payload: MediaProductionPayload): Promise<ProcessState> {
  const rawScript = String(payload.script || payload.prompt || '').trim()
  if (!rawScript) return { state: 'failed', error: 'Video script is empty' }
  const script = clampScriptToSeconds(rawScript, HEYGEN_MAX_SCRIPT_SECONDS)

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
    await maybeNotifyVideoApproval(item.articleId, 'talking_head')
  }

  await recordMediaUsage({ kind: 'video', model: 'heygen', costUsd: estimateVideoCostUsd(estimateSpeechSeconds(script)), articleId: item.articleId })
  return { state: 'success', url: uploaded.url, key: uploaded.key }
}

// Fetch a remote asset and re-host it on R2.
async function downloadToR2(url: string, fallbackContentType: string, kind: 'social-video' | 'generated-ig', label: string) {
  const asset = await fetchBinary(url, fallbackContentType)
  return uploadToR2({ body: asset.buffer, filename: `${label}-${Date.now()}.bin`, contentType: asset.contentType, kind })
}

// 9:16 still for scene backgrounds (panned with Ken Burns motion in Remotion).
async function generateSceneImage(prompt: string) {
  const falKey = await getFalKey()
  if (!falKey) throw new Error('FAL_KEY not configured')
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `${prompt}. Cinematic vertical 9:16 business backdrop, no text, photorealistic, natural lighting.`,
      image_size: { width: 1080, height: 1920 },
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

// fal.ai queue API for B-roll video generation. Returns a status URL to poll.
// NOTE: model id and response shape may need tuning to the chosen fal model.
async function submitFalVideo(prompt: string, model?: string): Promise<string> {
  const falKey = await getFalKey()
  if (!falKey) throw new Error('FAL_KEY not configured')
  const m = model && model.includes('/') ? model : 'fal-ai/kling-video/v1/standard/text-to-video'
  const res = await fetch(`https://queue.fal.run/${m}`, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration: '5', aspect_ratio: '9:16' }),
  })
  if (!res.ok) throw new Error(`fal video submit error: ${await res.text()}`)
  const data = await res.json() as { status_url?: string; request_id?: string }
  const statusUrl = data.status_url || (data.request_id ? `https://queue.fal.run/${m}/requests/${data.request_id}/status` : '')
  if (!statusUrl) throw new Error('fal video: no status_url returned')
  return statusUrl
}

async function pollFalVideo(statusUrl: string): Promise<{ status: 'processing' } | { status: 'failed'; error?: string } | { status: 'completed'; videoUrl: string }> {
  const falKey = await getFalKey()
  const res = await fetch(statusUrl, { headers: { Authorization: `Key ${falKey}` } })
  const data = await res.json() as { status?: string; response_url?: string }
  if (data.status === 'COMPLETED') {
    const responseUrl = data.response_url || statusUrl.replace(/\/status$/, '')
    const out = await (await fetch(responseUrl, { headers: { Authorization: `Key ${falKey}` } })).json() as {
      video?: { url?: string }; video_url?: string; videos?: { url?: string }[]
    }
    const videoUrl = out.video?.url || out.video_url || out.videos?.[0]?.url
    if (!videoUrl) return { status: 'failed', error: 'fal video: no url in response' }
    return { status: 'completed', videoUrl }
  }
  if (data.status === 'FAILED' || data.status === 'ERROR') return { status: 'failed', error: 'fal video failed' }
  return { status: 'processing' }
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
      caption: true, // burn-in subtitles for sound-off viewing
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
