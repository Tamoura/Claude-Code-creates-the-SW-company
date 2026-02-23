"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Job } from "@/types";

interface JobFilters {
  q: string;
  location: string;
  workType: string;
  experienceLevel: string;
}

interface JobsMeta {
  cursor: string | null;
  hasMore: boolean;
  count: number;
}

interface JobsResponse {
  success: boolean;
  data: Job[];
  meta: JobsMeta;
  error?: { code: string; message: string };
}

interface ApplyResponse {
  id: string;
  appliedAt: string;
}

/**
 * Jobs data hook for ConnectIn.
 * Manages job search with filters, cursor-based pagination,
 * optimistic save toggling, and job application.
 *
 * Usage:
 *   const { jobs, isLoading, filters, setFilter, loadMore, saveJob, unsaveJob, applyToJob } = useJobs();
 */
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({
    q: "",
    location: "",
    workType: "",
    experienceLevel: "",
  });

  const buildParams = useCallback(
    (f: JobFilters, paginationCursor?: string | null): Record<string, string> => {
      const params: Record<string, string> = { limit: "20" };
      if (f.q) params.q = f.q;
      if (f.location) params.location = f.location;
      if (f.workType) params.workType = f.workType;
      if (f.experienceLevel) params.experienceLevel = f.experienceLevel;
      if (paginationCursor) params.cursor = paginationCursor;
      return params;
    },
    []
  );

  const fetchJobs = useCallback(
    async (activeFilters: JobFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = (await apiClient.get<Job[]>("/jobs", {
          params: buildParams(activeFilters),
        })) as unknown as JobsResponse;

        if (response.success && response.data) {
          setJobs(response.data);
          setHasMore(response.meta?.hasMore ?? false);
          setCursor(response.meta?.cursor ?? null);
        } else {
          setError(response.error?.message || "Failed to load jobs");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [buildParams]
  );

  const setFilter = useCallback(
    (key: keyof JobFilters, value: string) => {
      setFilters((prev) => {
        const updated = { ...prev, [key]: value };
        // Trigger re-fetch with new filters (cursor reset)
        setCursor(null);
        fetchJobs(updated);
        return updated;
      });
    },
    [fetchJobs]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = (await apiClient.get<Job[]>("/jobs", {
        params: buildParams(filters, cursor),
      })) as unknown as JobsResponse;

      if (response.success && response.data) {
        setJobs((prev) => [...prev, ...response.data]);
        setHasMore(response.meta?.hasMore ?? false);
        setCursor(response.meta?.cursor ?? null);
      }
    } catch {
      // Silent fail for pagination — user can retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, cursor, filters, buildParams]);

  const saveJob = useCallback(async (jobId: string) => {
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isSaved: true } : j))
    );

    try {
      const response = await apiClient.post(`/jobs/${jobId}/save`);
      if (!response.success) {
        // Revert on failure
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, isSaved: false } : j))
        );
      }
    } catch {
      // Revert on network error
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isSaved: false } : j))
      );
    }
  }, []);

  const unsaveJob = useCallback(async (jobId: string) => {
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isSaved: false } : j))
    );

    try {
      const response = await apiClient.delete(`/jobs/${jobId}/save`);
      if (!response.success) {
        // Revert on failure
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, isSaved: true } : j))
        );
      }
    } catch {
      // Revert on network error
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isSaved: true } : j))
      );
    }
  }, []);

  const applyToJob = useCallback(
    async (jobId: string, coverNote?: string): Promise<string | undefined> => {
      try {
        const response = await apiClient.post<ApplyResponse>(
          `/jobs/${jobId}/apply`,
          { coverNote: coverNote ?? "" }
        );

        if (response.success && response.data) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, isApplied: true, applicationId: response.data!.id }
                : j
            )
          );
          return response.data.id;
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    []
  );

  useEffect(() => {
    fetchJobs(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    jobs,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    filters,
    setFilter,
    loadMore,
    saveJob,
    unsaveJob,
    applyToJob,
  };
}
