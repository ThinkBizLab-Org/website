// Re-exports the shared types from the main app (single source of truth) plus
// the studio default props. See ../../lib/video-shared-types.ts.

export type {
  SceneType,
  SceneBackground,
  VideoFormat,
  RemotionSceneProps,
  RemotionCaption,
  RemotionInputProps,
} from '../../lib/video-shared-types'

import type { RemotionInputProps } from '../../lib/video-shared-types'

export const DEFAULT_INPUT_PROPS: RemotionInputProps = {
  format: 'motion_graphics',
  durationSec: 13,
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [
    { type: 'hook', text: 'ThinkBiz Lab', bg: 'brand', durationSec: 4 },
    { type: 'keypoint', text: 'ตัวอย่างเนื้อหาธุรกิจ', bg: 'solid', durationSec: 6 },
    { type: 'cta', text: 'ติดตาม ThinkBiz Lab', bg: 'brand', durationSec: 3 },
  ],
  captions: [
    { text: 'ตัวอย่างคำบรรยาย', fromFrame: 0, durationInFrames: 90 },
  ],
}
