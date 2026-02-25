"use client";

interface MediaImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

interface MediaGalleryProps {
  images: MediaImage[];
}

const MAX_VISIBLE = 4;

/**
 * Displays post images in a responsive grid.
 * - 1 image: full width
 * - 2 images: side by side
 * - 3+ images: grid with "+N more" overlay on the 4th slot
 */
export function MediaGallery({ images }: MediaGalleryProps) {
  if (images.length === 0) return null;

  const visible = images.slice(0, MAX_VISIBLE);
  const extraCount = images.length - MAX_VISIBLE;

  if (images.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-[12px]">
        <img
          src={visible[0].url}
          alt={visible[0].alt}
          className="w-full object-cover max-h-96"
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-[12px]">
        {visible.map((img) => (
          <img
            key={img.url}
            src={img.url}
            alt={img.alt}
            className="w-full h-48 object-cover"
          />
        ))}
      </div>
    );
  }

  // 3+ images: 2-column grid, last slot may have overlay
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-[12px]">
      {visible.map((img, idx) => {
        const isLast = idx === MAX_VISIBLE - 1 && extraCount > 0;
        return (
          <div key={img.url} className="relative">
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-40 object-cover"
            />
            {isLast && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-white text-xl font-bold">+{extraCount}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
