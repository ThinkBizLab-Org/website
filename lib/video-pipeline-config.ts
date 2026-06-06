import { getSetting, setSetting } from './settings-store'

// Feature configuration for the hybrid short-video pipeline. Stored as JSON in
// the `video_pipeline` setting. Disabled by default so the existing HeyGen
// short_video path is untouched until the Remotion render infra is provisioned.

export const VIDEO_PIPELINE_SETTING = 'video_pipeline'

export type TtsProvider = 'none' | 'elevenlabs' | 'google'
export type VideoEngine = 'remotion' | 'heygen'

export type VideoPipelineConfig = {
  enabled: boolean
  engine: VideoEngine
  allowTalkingHead: boolean
  maxBrollScenes: number
  maxDurationSec: number
  minDurationSec: number
  ttsProvider: TtsProvider
  // Default fal.ai model id for B-roll generation when a scene does not name one.
  brollModel: string
  // When true, a rendered video must be human-approved before the social queue
  // auto-posts it to TikTok / Instagram Reels.
  requireApproval: boolean
}

export const DEFAULT_VIDEO_PIPELINE: VideoPipelineConfig = {
  enabled: false,
  engine: 'remotion',
  allowTalkingHead: true,
  maxBrollScenes: 1,
  maxDurationSec: 30,
  minDurationSec: 12,
  ttsProvider: 'none',
  brollModel: 'fal-ai/kling-video/v1/standard/text-to-video',
  requireApproval: false,
}

function asEngine(value: unknown): VideoEngine {
  return value === 'heygen' ? 'heygen' : 'remotion'
}

function asTtsProvider(value: unknown): TtsProvider {
  return value === 'elevenlabs' || value === 'google' ? value : 'none'
}

export function parseVideoPipelineConfig(raw: unknown): VideoPipelineConfig {
  let source: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      source = JSON.parse(raw) as Record<string, unknown>
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === 'object') {
    source = raw as Record<string, unknown>
  }
  const num = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback
  }
  const bool = (value: unknown, fallback: boolean) =>
    value === undefined ? fallback : value === true || value === 'true'
  const brollModel = typeof source.brollModel === 'string' && source.brollModel.trim()
    ? source.brollModel.trim()
    : DEFAULT_VIDEO_PIPELINE.brollModel

  return {
    enabled: source.enabled === true || source.enabled === 'true',
    engine: asEngine(source.engine),
    allowTalkingHead: bool(source.allowTalkingHead, DEFAULT_VIDEO_PIPELINE.allowTalkingHead),
    maxBrollScenes: num(source.maxBrollScenes, DEFAULT_VIDEO_PIPELINE.maxBrollScenes, 0, 4),
    maxDurationSec: num(source.maxDurationSec, DEFAULT_VIDEO_PIPELINE.maxDurationSec, 12, 90),
    minDurationSec: num(source.minDurationSec, DEFAULT_VIDEO_PIPELINE.minDurationSec, 5, 60),
    ttsProvider: asTtsProvider(source.ttsProvider),
    brollModel,
    requireApproval: bool(source.requireApproval, DEFAULT_VIDEO_PIPELINE.requireApproval),
  }
}

export async function loadVideoPipelineConfig(): Promise<VideoPipelineConfig> {
  try {
    return parseVideoPipelineConfig(await getSetting(VIDEO_PIPELINE_SETTING))
  } catch {
    return { ...DEFAULT_VIDEO_PIPELINE }
  }
}

export async function saveVideoPipelineConfig(config: VideoPipelineConfig): Promise<VideoPipelineConfig> {
  const normalized = parseVideoPipelineConfig(config)
  await setSetting(VIDEO_PIPELINE_SETTING, JSON.stringify(normalized))
  return normalized
}
