"use client";

interface VideoPlayerProps {
  url: string;
  poster?: string;
  className?: string;
}

/**
 * Simple HTML5 video player for post media.
 */
export function VideoPlayer({ url, poster, className }: VideoPlayerProps) {
  return (
    <div className={`mt-3 overflow-hidden rounded-[12px] ${className ?? ""}`}>
      <video
        src={url}
        poster={poster}
        controls
        preload="metadata"
        className="w-full max-h-96 object-contain bg-black"
        aria-label="Post video"
      />
    </div>
  );
}
