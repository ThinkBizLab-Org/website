// Input props for the ShortVideo composition. Mirrors RemotionInputProps in
// the main app (lib/video-pipeline.ts). Keep the two in sync.

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

export type RemotionInputProps = {
  format: VideoFormat
  durationSec: number
  fps: number
  width: number
  height: number
  voiceUrl?: string
  scenes: RemotionSceneProps[]
}

export const DEFAULT_INPUT_PROPS: RemotionInputProps = {
  format: 'motion_graphics',
  durationSec: 20,
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [
    { type: 'hook', text: 'ThinkBiz Lab', bg: 'brand', durationSec: 4 },
    { type: 'keypoint', text: 'ตัวอย่างเนื้อหา', bg: 'solid', durationSec: 6 },
    { type: 'cta', text: 'ติดตาม ThinkBiz Lab', bg: 'brand', durationSec: 3 },
  ],
}
