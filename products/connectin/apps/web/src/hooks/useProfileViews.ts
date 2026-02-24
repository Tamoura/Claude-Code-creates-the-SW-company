"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { ProfileViewer } from "@/types";

/**
 * Profile views data hook for ConnectIn.
 * Fetches the list of users who viewed the current user's profile
 * and the total view count.
 *
 * Usage:
 *   const { viewers, count, isLoading, error } = useProfileViews();
 */
export function useProfileViews() {
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [viewersRes, countRes] = await Promise.all([
        apiClient.get<ProfileViewer[]>("/profiles/me/views"),
        apiClient.get<{ count: number }>("/profiles/me/views/count"),
      ]);

      if (viewersRes.success && viewersRes.data) {
        setViewers(viewersRes.data as ProfileViewer[]);
      }

      if (countRes.success && countRes.data) {
        setCount((countRes.data as { count: number }).count);
      }

      if (!viewersRes.success && !countRes.success) {
        setError(viewersRes.error?.message || "Failed to load views");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  return { viewers, count, isLoading, error, refetch: fetchViews };
}
