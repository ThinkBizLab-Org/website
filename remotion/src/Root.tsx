import React from 'react'
import { Composition } from 'remotion'
import { ShortVideo, totalFrames } from './ShortVideo'
import { DEFAULT_INPUT_PROPS, type RemotionInputProps } from './types'

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={totalFrames(DEFAULT_INPUT_PROPS)}
      fps={DEFAULT_INPUT_PROPS.fps}
      width={DEFAULT_INPUT_PROPS.width}
      height={DEFAULT_INPUT_PROPS.height}
      defaultProps={DEFAULT_INPUT_PROPS}
      // Resize the timeline to match the actual scenes passed at render time.
      calculateMetadata={({ props }: { props: RemotionInputProps }) => ({
        durationInFrames: totalFrames(props),
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  )
}
