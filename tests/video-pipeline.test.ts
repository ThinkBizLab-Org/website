import { describe, expect, it } from 'vitest'
import {
  REMOTION_VIDEO,
  VIDEO_STAGES,
  buildRemotionInputProps,
  isVideoProgress,
  nextVideoStage,
  scenesNeedingBackground,
} from '@/lib/video-pipeline'
import type { RoutedVideoPlan } from '@/lib/video-router'

const routed: RoutedVideoPlan = {
  format: 'hybrid',
  durationSec: 18,
  voiceover: true,
  voiceoverScript: 'พากย์',
  warnings: [],
  scenes: [
    { type: 'hook', text: 'พาดหัว', bg: 'flux', durationSec: 4, source: 'flux' },
    { type: 'data', text: '', stat: '70%', bg: 'solid', durationSec: 5, source: 'native' },
    { type: 'keypoint', text: 'B-roll', bg: 'broll', durationSec: 6, source: 'fal-video' },
    { type: 'cta', text: 'ติดตาม', bg: 'brand', durationSec: 3, source: 'native' },
  ],
}

describe('video pipeline stages', () => {
  it('advances stages then terminates', () => {
    expect(VIDEO_STAGES).toEqual(['assets', 'render', 'finalize'])
    expect(nextVideoStage('assets')).toBe('render')
    expect(nextVideoStage('render')).toBe('finalize')
    expect(nextVideoStage('finalize')).toBeNull()
  })

  it('recognises a valid progress object', () => {
    expect(isVideoProgress({ stage: 'render', renderId: 'x' })).toBe(true)
    expect(isVideoProgress({ stage: 'bogus' })).toBe(false)
    expect(isVideoProgress(null)).toBe(false)
    expect(isVideoProgress('assets')).toBe(false)
  })

  it('lists only scenes that need a generated background', () => {
    const need = scenesNeedingBackground(routed)
    expect(need.map(n => n.index)).toEqual([0, 2]) // flux + fal-video, not native
  })

  it('builds renderer input props with resolved assets', () => {
    const props = buildRemotionInputProps(routed, { sceneBgUrls: { 0: 'https://r2/img.jpg', 2: 'https://r2/broll.mp4' }, voiceUrl: 'https://r2/voice.mp3' })
    expect(props.fps).toBe(REMOTION_VIDEO.fps)
    expect(props.width).toBe(1080)
    expect(props.height).toBe(1920)
    expect(props.voiceUrl).toBe('https://r2/voice.mp3')
    expect(props.scenes[0].backgroundUrl).toBe('https://r2/img.jpg')
    expect(props.scenes[1].backgroundUrl).toBeUndefined() // native scene
    expect(props.scenes[2].backgroundUrl).toBe('https://r2/broll.mp4')
  })
})
