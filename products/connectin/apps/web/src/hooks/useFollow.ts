"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";

interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * Hook for managing follow/unfollow state for a user.
 */
export function useFollow(userId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      const res = await apiClient.get<FollowStatus>(`/follows/${userId}/status`);
      if (cancelled) return;
      if (res.success && res.data) {
        const data = res.data as FollowStatus;
        setIsFollowing(data.isFollowing);
        setFollowerCount(data.followerCount ?? 0);
      }
    }
    fetchStatus();
    return () => { cancelled = true; };
  }, [userId]);

  const toggleFollow = useCallback(async () => {
    const prev = isFollowing;
    const prevCount = followerCount;
    // Optimistic
    setIsFollowing(!prev);
    setFollowerCount((c) => (prev ? c - 1 : c + 1));
    setIsLoading(true);
    try {
      let res;
      if (prev) {
        res = await apiClient.delete(`/follows/${userId}`);
      } else {
        res = await apiClient.post(`/follows/${userId}`, {});
      }
      if (!res.success) {
        setIsFollowing(prev);
        setFollowerCount(prevCount);
      }
    } catch {
      setIsFollowing(prev);
      setFollowerCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, followerCount, userId]);

  return { isFollowing, followerCount, isLoading, toggleFollow };
}
