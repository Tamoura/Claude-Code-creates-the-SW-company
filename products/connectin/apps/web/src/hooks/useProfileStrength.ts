"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface ProfileStrengthData {
  score: number;
  completeness: number;
  suggestions: string[];
}

/**
 * Hook that fetches profile strength score and suggestions for the current user.
 */
export function useProfileStrength() {
  const [data, setData] = useState<ProfileStrengthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      const res = await apiClient.get<ProfileStrengthData>("/profiles/me/strength");
      if (cancelled) return;
      if (res.success && res.data) {
        setData(res.data as ProfileStrengthData);
      }
      setIsLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading };
}
