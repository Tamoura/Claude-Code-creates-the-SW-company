"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Job } from "@/types";

export interface MyApplication {
  id: string;
  status: string;
  coverNote: string | null;
  appliedAt: string;
  job: Job;
}

interface ApplicationsMeta {
  cursor: string | null;
  hasMore: boolean;
  count: number;
}

interface ApplicationsResponse {
  success: boolean;
  data: MyApplication[];
  meta: ApplicationsMeta;
  error?: { code: string; message: string };
}

export function useMyApplications() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = (await apiClient.get<MyApplication[]>(
        "/jobs/my-applications",
        { params: { limit: "20" } }
      )) as unknown as ApplicationsResponse;

      if (response.success && response.data) {
        setApplications(response.data);
        setHasMore(response.meta?.hasMore ?? false);
        setCursor(response.meta?.cursor ?? null);
      } else {
        setError(response.error?.message || "Failed to load applications");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params: Record<string, string> = { limit: "20" };
      if (cursor) params.cursor = cursor;
      const response = (await apiClient.get<MyApplication[]>(
        "/jobs/my-applications",
        { params }
      )) as unknown as ApplicationsResponse;

      if (response.success && response.data) {
        setApplications((prev) => [...prev, ...response.data]);
        setHasMore(response.meta?.hasMore ?? false);
        setCursor(response.meta?.cursor ?? null);
      }
    } catch {
      // Silent fail for pagination
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, cursor]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch: fetchApplications,
  };
}
