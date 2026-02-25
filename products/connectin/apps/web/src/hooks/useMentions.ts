"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import type { SearchPersonResult } from "@/types";

/**
 * Hook for @mention autocomplete search.
 * Debounces query and fetches matching users.
 */
export function useMentions(query: string, enabled: boolean) {
  const [results, setResults] = useState<SearchPersonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !query) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResults([]);
      setIsLoading(true);
      const res = await apiClient.get<SearchPersonResult[]>("/search/people", {
        params: { q: query },
      });
      if (res.success && res.data) {
        setResults(res.data as SearchPersonResult[]);
      }
      setIsLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled]);

  return { results, isLoading };
}
