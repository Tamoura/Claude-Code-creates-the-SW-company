"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Bookmark } from "@/types";

/**
 * Bookmarks data hook for ConnectIn.
 * Manages saved posts and jobs with optimistic updates.
 *
 * Usage:
 *   const { bookmarks, isLoading, filteredBookmarks, addBookmark, removeBookmark } = useBookmarks();
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Bookmark[]>("/bookmarks", { params: {} });
      if (response.success && response.data) {
        setBookmarks(response.data as Bookmark[]);
      } else {
        setError(response.error?.message || "Failed to load bookmarks");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredBookmarks = useCallback(
    (type: "all" | "post" | "job") => {
      if (type === "all") return bookmarks;
      return bookmarks.filter((b) => b.targetType === type);
    },
    [bookmarks]
  );

  const addBookmark = useCallback(
    async (targetId: string, targetType: "post" | "job") => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Bookmark = {
        id: tempId,
        userId: "",
        targetId,
        targetType,
        createdAt: new Date().toISOString(),
      };
      setBookmarks((prev) => [optimistic, ...prev]);

      try {
        const response = await apiClient.post<Bookmark>("/bookmarks", { targetId, targetType });
        if (response.success && response.data) {
          setBookmarks((prev) =>
            prev.map((b) => (b.id === tempId ? (response.data as Bookmark) : b))
          );
        } else {
          setBookmarks((prev) => prev.filter((b) => b.id !== tempId));
        }
      } catch {
        setBookmarks((prev) => prev.filter((b) => b.id !== tempId));
      }
    },
    []
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      const removed = bookmarks.find((b) => b.id === bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));

      try {
        const response = await apiClient.delete(`/bookmarks/${bookmarkId}`);
        if (!response.success && removed) {
          setBookmarks((prev) => [...prev, removed]);
        }
      } catch {
        if (removed) setBookmarks((prev) => [...prev, removed]);
      }
    },
    [bookmarks]
  );

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    filteredBookmarks,
    addBookmark,
    removeBookmark,
    refetch: fetchBookmarks,
  };
}
