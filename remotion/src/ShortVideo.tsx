import React from 'react'
import { AbsoluteFill, Audio, Sequence } from 'remotion'
import { Scene, fontStack } from './Scenes'
import type { RemotionCaption, RemotionInputProps } from './types'

// Subtitle band synced to the narration (one Sequence per caption segment).
const Captions: React.FC<{ captions: RemotionCaption[] }> = ({ captions }) => (
  <>
    {captions.map((caption, index) => (
      <Sequence key={index} from={caption.fromFrame} durationInFrames={caption.durationInFrames}>
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: 120, fontFamily: fontStack }}>
          <div
            style={{
              maxWidth: 900,
              textAlign: 'center',
              fontSize: 46,
              fontWeight: 600,
              color: '#F8FAFC',
              background: 'rgba(15,23,42,0.62)',
              padding: '16px 28px',
              borderRadius: 18,
              lineHeight: 1.35,
            }}
          >
            {caption.text}
          </div>
        </AbsoluteFill>
      </Sequence>
    ))}
  </>
)

// Lays scenes out sequentially, overlays the voiceover track and captions.
export const ShortVideo: React.FC<RemotionInputProps> = ({ scenes, voiceUrl, captions, fps }) => {
  let cursor = 0
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {voiceUrl && <Audio src={voiceUrl} />}
      {scenes.map((scene, index) => {
        const from = cursor
        const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps))
        cursor += durationInFrames
        return (
          <Sequence key={index} from={from} durationInFrames={durationInFrames}>
            <Scene scene={scene} />
          </Sequence>
        )
      })}
      {captions && captions.length > 0 && <Captions captions={captions} />}
    </AbsoluteFill>
  )
}

// Total composition length in frames from the scene durations.
export function totalFrames(props: RemotionInputProps): number {
  return Math.max(1, Math.round(props.scenes.reduce((sum, s) => sum + s.durationSec, 0) * props.fps))
}
