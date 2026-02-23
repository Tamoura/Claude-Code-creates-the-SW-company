"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { SearchResults, SearchType } from "@/types";

interface SearchResponse {
  success: boolean;
  data?: SearchResults;
  error?: { code: string; message: string };
}

/**
 * Search hook for ConnectIn.
 * Fetches unified search results from GET /api/v1/search.
 */
export function useSearch() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, type?: SearchType) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { q: trimmed };
      if (type) params.type = type;

      const response = (await apiClient.get<SearchResults>("/search", {
        params,
      })) as unknown as SearchResponse;

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error?.message || "Search failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, isLoading, error, search, clear };
}
