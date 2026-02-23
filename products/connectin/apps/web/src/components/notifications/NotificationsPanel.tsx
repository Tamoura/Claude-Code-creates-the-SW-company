"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { Notification } from "@/types";

interface NotificationsPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  unreadCount: number;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationsPanel({
  notifications,
  isLoading,
  unreadCount,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const { t } = useTranslation("common");
  const panelRef = useFocusTrap(true);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, panelRef]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("notifications.title")}
      className="absolute end-0 top-full mt-2 w-[360px] max-h-[480px] rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-lg border border-[#E2E8F0] dark:border-white/8 flex flex-col overflow-hidden z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-white/8 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
          {t("notifications.title")}
          {unreadCount > 0 && (
            <span className="ms-2 inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-[#57BBCE] text-white text-[11px] font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs text-[#57BBCE] hover:text-[#4AAEC1] font-medium transition-colors"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" role="list">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-[#E2E8F0] dark:divide-white/8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[#F1F5F9] dark:bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-[#F1F5F9] dark:bg-white/5 animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-[#F1F5F9] dark:bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-neutral-500">{t("notifications.noNotifications")}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-white/8" role="list">
            {notifications.map((n) => (
              <div key={n.id} role="listitem">
                <NotificationItem notification={n} onMarkRead={onMarkRead} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
