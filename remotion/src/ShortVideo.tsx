import React from 'react'
import { AbsoluteFill, Audio, Sequence } from 'remotion'
import { Scene } from './Scenes'
import type { RemotionInputProps } from './types'

// Lays scenes out sequentially and overlays the voiceover track (if any).
export const ShortVideo: React.FC<RemotionInputProps> = ({ scenes, voiceUrl, fps }) => {
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
    </AbsoluteFill>
  )
}

// Total composition length in frames from the scene durations.
export function totalFrames(props: RemotionInputProps): number {
  return Math.max(1, Math.round(props.scenes.reduce((sum, s) => sum + s.durationSec, 0) * props.fps))
}
