"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

/**
 * Hook for uploading a profile banner image.
 */
export function useBanner(initialBannerUrl?: string) {
  const [bannerUrl, setBannerUrl] = useState<string | undefined>(initialBannerUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadBanner = useCallback(async (file: File): Promise<boolean> => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("banner", file);
      const res = await apiClient.put<{ bannerUrl: string }>("/profiles/me/banner", formData);
      if (res.success && res.data) {
        setBannerUrl((res.data as { bannerUrl: string }).bannerUrl);
        return true;
      }
      setError(res.error?.message || "Upload failed");
      return false;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { bannerUrl, isUploading, error, uploadBanner };
}
