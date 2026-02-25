"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";

export type ReactionType = "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "FUNNY";

interface ReactionsData {
  myReaction: ReactionType | null;
  totalCount: number;
  breakdown: Partial<Record<ReactionType, number>>;
}

/**
 * Hook for managing post reactions (multi-type).
 * Fetches reaction state on mount and provides a react() action
 * that toggles or switches reactions with optimistic updates.
 */
export function useReactions(postId: string) {
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [breakdown, setBreakdown] = useState<Partial<Record<ReactionType, number>>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchReactions() {
      try {
        const res = await apiClient.get<ReactionsData>(`/feed/posts/${postId}/reactions`);
        if (cancelled) return;
        if (res && res.success && res.data) {
          const data = res.data as ReactionsData;
          setMyReaction(data.myReaction ?? null);
          setTotalCount(data.totalCount ?? 0);
          setBreakdown(data.breakdown ?? {});
        }
      } catch {
        // silent - reactions fetch failure is non-critical
      }
    }
    fetchReactions();
    return () => { cancelled = true; };
  }, [postId]);

  const react = useCallback(
    async (type: ReactionType) => {
      const prevReaction = myReaction;
      const prevCount = totalCount;
      const prevBreakdown = { ...breakdown };

      // Optimistic update
      if (myReaction === type) {
        // Toggle off
        setMyReaction(null);
        setTotalCount((c) => Math.max(0, c - 1));
        setBreakdown((prev) => {
          const next = { ...prev };
          if (next[type] && next[type]! > 1) {
            next[type] = next[type]! - 1;
          } else {
            delete next[type];
          }
          return next;
        });
      } else {
        // Switch or new reaction
        if (myReaction) {
          setBreakdown((prev) => {
            const next = { ...prev };
            if (next[myReaction] && next[myReaction]! > 1) {
              next[myReaction] = next[myReaction]! - 1;
            } else {
              delete next[myReaction];
            }
            next[type] = (next[type] ?? 0) + 1;
            return next;
          });
        } else {
          setTotalCount((c) => c + 1);
          setBreakdown((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }));
        }
        setMyReaction(type);
      }

      try {
        setIsLoading(true);
        let res;
        if (prevReaction === type) {
          res = await apiClient.delete(`/feed/posts/${postId}/react`);
        } else {
          res = await apiClient.post(`/feed/posts/${postId}/react`, { type });
        }
        if (!res.success) {
          // Revert
          setMyReaction(prevReaction);
          setTotalCount(prevCount);
          setBreakdown(prevBreakdown);
        }
      } catch {
        setMyReaction(prevReaction);
        setTotalCount(prevCount);
        setBreakdown(prevBreakdown);
      } finally {
        setIsLoading(false);
      }
    },
    [myReaction, totalCount, breakdown, postId]
  );

  return { myReaction, totalCount, breakdown, isLoading, react };
}
