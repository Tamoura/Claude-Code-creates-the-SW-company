import { useRef, useImperativeHandle, forwardRef } from 'react'
import ReactPlayer from 'react-player'
import { Card } from './ui/Card'

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
}

interface VideoPlayerProps {
  url: string
  onProgress?: (state: { playedSeconds: number }) => void
  playing?: boolean
  onReady?: () => void
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ url, onProgress, playing = false, onReady }, ref) => {
    const playerRef = useRef<any>(null)

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, 'seconds')
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0
      }
    }))

    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black">
          {/* @ts-expect-error - ReactPlayer types mismatch in prototype */}
          <ReactPlayer
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            controls
            playing={playing}
            onProgress={onProgress as any}
            onReady={onReady}
          />
        </div>
      </Card>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'
