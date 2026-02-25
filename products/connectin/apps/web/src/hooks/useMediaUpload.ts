"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

interface UploadedMedia {
  id: string;
  url: string;
  type: "image" | "video";
  previewUrl?: string;
}

/**
 * Hook for managing media file uploads.
 * Uploads to POST /media/upload and tracks upload state.
 */
export function useMediaUpload() {
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadedMedia | null> => {
    setIsUploading(true);
    setError(null);
    try {
      // We use apiClient.post with a FormData body (the API expects multipart)
      // For the hook, we pass metadata to the post endpoint
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<UploadedMedia>("/media/upload", formData);
      if (res.success && res.data) {
        const media = res.data as UploadedMedia;
        setUploads((prev) => [...prev, media]);
        return media;
      }
      setError(res.error?.message || "Upload failed");
      return null;
    } catch {
      setError("Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeUpload = useCallback((index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  return { uploads, isUploading, error, upload, removeUpload, clearUploads };
}
