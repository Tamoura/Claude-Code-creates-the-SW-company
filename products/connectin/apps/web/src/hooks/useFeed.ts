"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Post } from "@/types";

interface FeedMeta {
  cursor: string | null;
  hasMore: boolean;
  count: number;
}

interface FeedResponse {
  data: Post[];
  meta: FeedMeta;
  success: boolean;
  error?: { code: string; message: string };
}

/**
 * Feed data hook for ConnectIn.
 * Manages feed posts with cursor-based pagination, post creation,
 * and optimistic like toggling.
 */
export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchFeed = useCallback(async (feedCursor?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "20" };
      if (feedCursor) params.cursor = feedCursor;

      const response = (await apiClient.get<Post[]>("/feed", {
        params,
      })) as unknown as FeedResponse;

      if (response.success && response.data) {
        setPosts(response.data);
        setHasMore(response.meta?.hasMore ?? false);
        setCursor(response.meta?.cursor ?? null);
      } else {
        setError(response.error?.message || "Failed to load feed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params: Record<string, string> = { limit: "20" };
      if (cursor) params.cursor = cursor;

      const response = (await apiClient.get<Post[]>("/feed", {
        params,
      })) as unknown as FeedResponse;

      if (response.success && response.data) {
        setPosts((prev) => [...prev, ...response.data]);
        setHasMore(response.meta?.hasMore ?? false);
        setCursor(response.meta?.cursor ?? null);
      }
    } catch {
      // Silent fail for pagination — user can retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, cursor]);

  const createPost = useCallback(
    async (content: string, textDirection: "LTR" | "RTL" | "AUTO" = "AUTO"): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const response = await apiClient.post<Post>("/feed/posts", {
          content,
          textDirection,
        });

        if (response.success && response.data) {
          setPosts((prev) => [response.data as Post, ...prev]);
          return true;
        } else {
          setError(response.error?.message || "Failed to create post");
          return false;
        }
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const toggleLike = useCallback(async (postId: string, isLiked: boolean) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLikedByMe: !isLiked,
              likeCount: isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      )
    );

    try {
      let response;
      if (isLiked) {
        response = await apiClient.delete(`/feed/posts/${postId}/like`);
      } else {
        response = await apiClient.post(`/feed/posts/${postId}/like`, {});
      }

      if (!response.success) {
        // Revert optimistic update on failure
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  isLikedByMe: isLiked,
                  likeCount: isLiked ? p.likeCount + 1 : p.likeCount - 1,
                }
              : p
          )
        );
      }
    } catch {
      // Revert optimistic update on network error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLikedByMe: isLiked,
                likeCount: isLiked ? p.likeCount + 1 : p.likeCount - 1,
              }
            : p
        )
      );
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    isSubmitting,
    error,
    hasMore,
    loadMore,
    createPost,
    toggleLike,
    refetch: () => fetchFeed(),
  };
}
