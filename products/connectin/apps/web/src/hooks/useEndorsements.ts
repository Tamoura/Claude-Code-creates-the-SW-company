"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

/**
 * Hook for managing skill endorsements.
 */
export function useEndorsements(skillId: string, initialEndorsed = false, initialCount = 0) {
  const [isEndorsed, setIsEndorsed] = useState(initialEndorsed);
  const [endorsementCount, setEndorsementCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const toggleEndorse = useCallback(
    async (): Promise<boolean> => {
      setIsLoading(true);
      try {
        let res;
        if (isEndorsed) {
          res = await apiClient.delete(`/endorsements/${skillId}`);
        } else {
          res = await apiClient.post(`/endorsements/${skillId}`, {});
        }
        if (res.success) {
          setIsEndorsed(!isEndorsed);
          setEndorsementCount((c) => isEndorsed ? c - 1 : c + 1);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isEndorsed, skillId]
  );

  return { isEndorsed, endorsementCount, isLoading, toggleEndorse };
}
