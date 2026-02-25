"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

type Visibility = "public" | "recruiters_only";

/**
 * Hook for managing Open-to-Work preference.
 */
export function useOpenToWork(initialOpenToWork: boolean, initialVisibility: Visibility) {
  const [openToWork, setOpenToWork] = useState(initialOpenToWork);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePreferences = useCallback(
    async (updates: { openToWork?: boolean; openToWorkVisibility?: Visibility }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.put("/profiles/me/preferences", {
          openToWork: updates.openToWork ?? openToWork,
          openToWorkVisibility: updates.openToWorkVisibility ?? visibility,
        });
        if (res.success) {
          if (updates.openToWork !== undefined) setOpenToWork(updates.openToWork);
          if (updates.openToWorkVisibility !== undefined) setVisibility(updates.openToWorkVisibility);
        } else {
          setError(res.error?.message || "Update failed");
        }
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    },
    [openToWork, visibility]
  );

  return { openToWork, visibility, isLoading, error, updatePreferences };
}
