"use client";

import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getIcon(type: Notification["type"]): string {
  switch (type) {
    case "CONNECTION_REQUEST": return "👤";
    case "CONNECTION_ACCEPTED": return "🤝";
    case "MESSAGE": return "💬";
    case "POST_LIKE": return "❤️";
    case "POST_COMMENT": return "💭";
    case "JOB_APPLICATION": return "📄";
    default: return "🔔";
  }
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <button
      type="button"
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
      className={cn(
        "w-full text-start px-4 py-3 flex gap-3 items-start",
        "hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors",
        !notification.isRead && "bg-[#EBF9FC]/60 dark:bg-[#57BBCE]/5"
      )}
      aria-label={notification.title}
    >
      {/* Icon */}
      <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
        {getIcon(notification.type)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm text-neutral-900 dark:text-neutral-100 leading-snug",
          !notification.isRead && "font-medium"
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-[11px] text-neutral-500 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span
          className="h-2 w-2 rounded-full bg-[#57BBCE] shrink-0 mt-1.5"
          aria-label="unread"
        />
      )}
    </button>
  );
}
