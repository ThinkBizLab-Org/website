// Single source of truth for the types shared between the Next.js app and the
// standalone Remotion project (remotion/src/types.ts imports from here). Keep
// this file dependency-free so both build graphs can consume it.

export type SceneType = 'hook' | 'data' | 'keypoint' | 'quote' | 'cta'
export type SceneBackground = 'solid' | 'brand' | 'flux' | 'broll'
export type VideoFormat = 'motion_graphics' | 'hybrid' | 'cinematic' | 'talking_head'

export type RemotionSceneProps = {
  type: SceneType
  text: string
  stat?: string
  label?: string
  bg: SceneBackground
  backgroundUrl?: string
  durationSec: number
}

// A subtitle segment, pre-timed in frames so the renderer can drop it straight
// into a <Sequence>.
export type RemotionCaption = {
  text: string
  fromFrame: number
  durationInFrames: number
}

export type RemotionInputProps = {
  format: VideoFormat
  durationSec: number
  fps: number
  width: number
  height: number
  voiceUrl?: string
  scenes: RemotionSceneProps[]
  captions?: RemotionCaption[]
}
