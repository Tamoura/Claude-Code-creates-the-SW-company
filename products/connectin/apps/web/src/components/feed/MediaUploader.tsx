"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { apiClient } from "@/lib/api";

interface UploadedMedia {
  id: string;
  url: string;
  type?: string;
}

interface MediaUploaderProps {
  onUpload: (media: UploadedMedia) => void;
  currentCount?: number;
  maxImages?: number;
}

const MAX_IMAGES = 4;

/**
 * Image/video attachment button for the post composer.
 * Handles file selection, preview, and upload to POST /media/upload.
 */
export function MediaUploader({
  onUpload,
  currentCount = 0,
  maxImages = MAX_IMAGES,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const isDisabled = currentCount >= maxImages || isUploading;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const previewUrl = URL.createObjectURL(file);
    setPreviews((prev) => [...prev, previewUrl]);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post<UploadedMedia>("/media/upload", formData);
      if (res.success && res.data) {
        onUpload(res.data as UploadedMedia);
      }
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePreview(idx: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preview thumbnails */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, idx) => (
            <div key={src} className="relative h-16 w-16 rounded-[8px] overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <img src={src} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePreview(idx)}
                aria-label={`Remove image ${idx + 1}`}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isDisabled}
        aria-label="Attach media"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        Photo/Video
      </button>

      <input
        ref={fileInputRef}
        data-testid="media-file-input"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
        className="sr-only"
        onChange={(e) => void handleFileChange(e)}
        tabIndex={-1}
      />
    </div>
  );
}
