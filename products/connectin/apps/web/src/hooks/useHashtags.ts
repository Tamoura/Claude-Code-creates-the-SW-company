"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface TrendingHashtag {
  id: string;
  tag: string;
  postCount: number;
}

/**
 * Hook for fetching and following hashtags.
 */
export function useHashtags() {
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    async function fetchTrending() {
      const res = await apiClient.get<TrendingHashtag[]>("/hashtags/trending");
      if (cancelled) return;
      if (res.success && res.data) {
        setTrending(res.data as TrendingHashtag[]);
      }
      setIsLoading(false);
    }
    fetchTrending();
    return () => { cancelled = true; };
  }, []);

  return { trending, isLoading };
}
