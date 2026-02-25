"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

/**
 * Hook for managing block/unblock of a user.
 */
export function useBlock(userId: string, initiallyBlocked = false) {
  const [isBlocked, setIsBlocked] = useState(initiallyBlocked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleBlock = useCallback(
    async (): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        let res;
        if (isBlocked) {
          res = await apiClient.delete(`/blocks/${userId}`);
        } else {
          res = await apiClient.post(`/blocks/${userId}`, {});
        }
        if (res.success) {
          setIsBlocked(!isBlocked);
          return true;
        }
        setError(res.error?.message || "Action failed");
        return false;
      } catch {
        setError("Network error");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isBlocked, userId]
  );

  return { isBlocked, isLoading, error, toggleBlock };
}
