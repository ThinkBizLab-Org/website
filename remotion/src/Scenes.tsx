import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont } from '@remotion/google-fonts/NotoSansThai'
import type { RemotionSceneProps } from './types'

const BRAND = {
  purple: '#7C3AED',
  ink: '#0F172A',
  paper: '#F8FAFC',
  accent: '#F59E0B',
}

// Bundle a Thai webfont so Thai glyphs render correctly on Lambda (where no
// system Thai font exists). loadFont() registers it before the first frame.
const { fontFamily: thaiFont } = loadFont('normal', { weights: ['400', '600', '700', '800'] })
export const fontStack = `${thaiFont}, system-ui, sans-serif`

// Ken Burns slow zoom for still (flux) backgrounds so they feel like motion.
function KenBurnsImage({ src }: { src: string }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.18])
  return (
    <AbsoluteFill>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.75) 100%)' }} />
    </AbsoluteFill>
  )
}

function Background({ scene }: { scene: RemotionSceneProps }) {
  if (scene.backgroundUrl && (scene.bg === 'flux' || scene.bg === 'broll')) {
    return <KenBurnsImage src={scene.backgroundUrl} />
  }
  if (scene.bg === 'brand') {
    return <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.purple} 0%, ${BRAND.ink} 100%)` }} />
  }
  return <AbsoluteFill style={{ backgroundColor: BRAND.ink }} />
}

export function Scene({ scene }: { scene: RemotionSceneProps }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 })
  const translateY = interpolate(enter, [0, 1], [40, 0])
  const opacity = interpolate(enter, [0, 1], [0, 1])

  const isData = scene.type === 'data' && scene.stat
  const isCta = scene.type === 'cta'

  return (
    <AbsoluteFill>
      <Background scene={scene} />
      <AbsoluteFill
        style={{
          padding: 96,
          justifyContent: scene.type === 'hook' ? 'flex-end' : 'center',
          alignItems: 'flex-start',
          fontFamily: fontStack,
          color: BRAND.paper,
        }}
      >
        <div style={{ transform: `translateY(${translateY}px)`, opacity }}>
          {isData && (
            <div style={{ fontSize: 220, fontWeight: 800, lineHeight: 1, color: BRAND.accent }}>{scene.stat}</div>
          )}
          {scene.label && (
            <div style={{ fontSize: 44, fontWeight: 600, marginBottom: 16, color: BRAND.accent }}>{scene.label}</div>
          )}
          {scene.text && (
            <div style={{ fontSize: isData ? 56 : 72, fontWeight: 700, lineHeight: 1.2, maxWidth: 860, textShadow: '0 2px 24px rgba(0,0,0,0.4)' }}>
              {scene.text}
            </div>
          )}
          {isCta && (
            <div style={{ marginTop: 32, fontSize: 40, fontWeight: 600, color: BRAND.accent }}>@thinkbizlab</div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
