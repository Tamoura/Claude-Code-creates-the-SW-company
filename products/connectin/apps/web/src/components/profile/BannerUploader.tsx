"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { apiClient } from "@/lib/api";

interface BannerUploaderProps {
  bannerUrl?: string;
  onBannerUpdated: (newUrl: string) => void;
}

/**
 * Profile banner display with edit-button overlay (own profile only).
 * Shows a gradient placeholder when no banner URL is provided.
 * Uploads via PUT /profiles/me/banner.
 */
export function BannerUploader({ bannerUrl, onBannerUpdated }: BannerUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(bannerUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("banner", file);
      const res = await apiClient.put<{ bannerUrl: string }>("/profiles/me/banner", formData);
      if (res.success && res.data) {
        const url = (res.data as { bannerUrl: string }).bannerUrl;
        setPreviewUrl(url);
        onBannerUpdated(url);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative h-[200px] w-full overflow-hidden">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Profile banner"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-r from-[#0C9AB8] to-[#0B6E7F]" />
      )}

      {/* Edit overlay */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Edit banner"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors disabled:opacity-60"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        {isUploading ? "Uploading..." : "Edit"}
      </button>

      <input
        ref={fileInputRef}
        data-testid="banner-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void handleFileChange(e)}
        tabIndex={-1}
      />
    </div>
  );
}
