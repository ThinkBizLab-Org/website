import { describe, expect, it } from 'vitest'
import {
  REMOTION_VIDEO,
  VIDEO_STAGES,
  buildCaptionTrack,
  buildRemotionInputProps,
  clampScriptToSeconds,
  estimateSpeechSeconds,
  isVideoProgress,
  nextVideoStage,
  reconcileSceneDurations,
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

  it('builds renderer input props with resolved assets and captions', () => {
    const props = buildRemotionInputProps(routed, { sceneBgUrls: { 0: 'https://r2/img.jpg', 2: 'https://r2/broll.mp4' }, voiceUrl: 'https://r2/voice.mp3' })
    expect(props.fps).toBe(REMOTION_VIDEO.fps)
    expect(props.width).toBe(1080)
    expect(props.height).toBe(1920)
    expect(props.voiceUrl).toBe('https://r2/voice.mp3')
    expect(props.scenes[0].backgroundUrl).toBe('https://r2/img.jpg')
    expect(props.scenes[1].backgroundUrl).toBeUndefined() // native scene
    expect(props.scenes[2].backgroundUrl).toBe('https://r2/broll.mp4')
    expect(props.captions && props.captions.length).toBeGreaterThan(0) // voiceover → captions
  })

  it('omits captions when there is no voiceover audio', () => {
    const props = buildRemotionInputProps(routed, { sceneBgUrls: {} })
    expect(props.captions).toBeUndefined()
  })
})

describe('caption + duration helpers', () => {
  it('estimates speech length from character count', () => {
    expect(estimateSpeechSeconds('')).toBe(1)
    expect(estimateSpeechSeconds('ก'.repeat(22))).toBe(2) // 22 chars / 11 cps
    expect(estimateSpeechSeconds('ก'.repeat(110))).toBe(10)
  })

  it('builds a caption track that spans the full duration without gaps', () => {
    const captions = buildCaptionTrack('ประโยคแรก. ประโยคที่สอง. ประโยคที่สาม.', 18, 30)
    expect(captions.length).toBeGreaterThanOrEqual(3)
    expect(captions[0].fromFrame).toBe(0)
    // segments are contiguous
    for (let i = 1; i < captions.length; i++) {
      expect(captions[i].fromFrame).toBe(captions[i - 1].fromFrame + captions[i - 1].durationInFrames)
    }
    const end = captions.at(-1)!.fromFrame + captions.at(-1)!.durationInFrames
    expect(end).toBe(18 * 30)
  })

  it('returns no captions for empty narration', () => {
    expect(buildCaptionTrack('   ', 18, 30)).toEqual([])
  })

  it('clamps an over-long script to the time budget at a boundary', () => {
    const short = 'สั้น ๆ พอดี'
    expect(clampScriptToSeconds(short, 45)).toBe(short) // under budget → unchanged

    const long = Array.from({ length: 40 }, (_, i) => `ประโยคที่ ${i} ยาวพอควรเพื่อทดสอบ.`).join(' ')
    const clamped = clampScriptToSeconds(long, 20)
    expect(clamped.length).toBeLessThan(long.length)
    expect(estimateSpeechSeconds(clamped)).toBeLessThanOrEqual(20)
  })

  it('stretches scene durations to cover the narration, capped at max', () => {
    const scenes = [{ durationSec: 4 }, { durationSec: 6 }] // sum 10
    expect(reconcileSceneDurations(scenes, 8, 30)).toEqual(scenes) // voice shorter → unchanged
    const stretched = reconcileSceneDurations(scenes, 20, 30)
    expect(stretched.reduce((s, x) => s + x.durationSec, 0)).toBeGreaterThanOrEqual(18)
    const capped = reconcileSceneDurations(scenes, 200, 14) // voice 200s but cap 14
    expect(capped.reduce((s, x) => s + x.durationSec, 0)).toBeLessThanOrEqual(16)
  })
})
