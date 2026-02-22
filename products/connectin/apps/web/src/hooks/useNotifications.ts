"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import type { Notification } from "@/types";

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  meta: { cursor: string | null; hasMore: boolean; count: number };
  error?: { message: string };
}

interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
  error?: { message: string };
}

/**
 * Notifications hook for ConnectIn.
 * Polls unread count every 30s. Loads full list on demand.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = (await apiClient.get<{ count: number }>(
        "/notifications/unread-count"
      )) as unknown as UnreadCountResponse;
      if (res.success && res.data) {
        setUnreadCount(res.data.count);
      }
    } catch {
      // silent — badge is non-critical
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = (await apiClient.get<Notification[]>("/notifications", {
        params: { limit: "20" },
      })) as unknown as NotificationsResponse;
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`, {});
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: false, readAt: null } : n
        )
      );
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prevCount = unreadCount;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await apiClient.patch("/notifications/read-all", {});
    } catch {
      // Revert
      setUnreadCount(prevCount);
      await fetchNotifications();
    }
  }, [unreadCount, fetchNotifications]);

  const openPanel = useCallback(async () => {
    setIsOpen(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    openPanel,
    closePanel,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
