"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

/**
 * Hook for managing repost/unpost state for a post.
 */
export function useReposts(postId: string, initialHasReposted = false, initialCount = 0) {
  const [hasReposted, setHasReposted] = useState(initialHasReposted);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const repost = useCallback(
    async (comment?: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await apiClient.post(`/feed/posts/${postId}/repost`, {
          ...(comment ? { comment } : {}),
        });
        if (res.success) {
          setHasReposted(true);
          setCount((c) => c + 1);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  const undoRepost = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiClient.delete(`/feed/posts/${postId}/repost`);
      if (res.success) {
        setHasReposted(false);
        setCount((c) => Math.max(0, c - 1));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  return { hasReposted, count, isLoading, repost, undoRepost };
}
