import { describe, expect, it } from 'vitest'
import { DEFAULT_VIDEO_PIPELINE, parseVideoPipelineConfig } from '@/lib/video-pipeline-config'

describe('video pipeline config', () => {
  it('defaults to disabled with safe values', () => {
    const config = parseVideoPipelineConfig('')
    expect(config).toEqual(DEFAULT_VIDEO_PIPELINE)
    expect(config.enabled).toBe(false)
  })

  it('parses and clamps a JSON config', () => {
    const config = parseVideoPipelineConfig(JSON.stringify({
      enabled: true, engine: 'remotion', allowTalkingHead: false,
      maxBrollScenes: 99, maxDurationSec: 5, minDurationSec: 1, ttsProvider: 'elevenlabs',
      brollModel: 'fal-ai/luma-dream-machine',
    }))
    expect(config.enabled).toBe(true)
    expect(config.allowTalkingHead).toBe(false)
    expect(config.maxBrollScenes).toBe(4) // clamped to max
    expect(config.maxDurationSec).toBe(12) // clamped to min bound
    expect(config.minDurationSec).toBe(5) // clamped to min bound
    expect(config.ttsProvider).toBe('elevenlabs')
    expect(config.brollModel).toBe('fal-ai/luma-dream-machine')
  })

  it('normalizes unknown engine/provider and defaults the B-roll model', () => {
    const config = parseVideoPipelineConfig({ engine: 'wat', ttsProvider: 'wat', brollModel: '   ' })
    expect(config.engine).toBe('remotion')
    expect(config.ttsProvider).toBe('none')
    expect(config.brollModel).toBe(DEFAULT_VIDEO_PIPELINE.brollModel)
  })
})
