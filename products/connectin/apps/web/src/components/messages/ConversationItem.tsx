"use client";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface ConversationItemProps {
  conversation: {
    id: string;
    contact: {
      userId: string;
      displayName: string;
      avatarUrl?: string | null;
      headline?: string | null;
    };
    lastMessage?: {
      content: string;
      createdAt: string;
      isRead: boolean;
      senderId?: string;
    } | null;
    unreadCount: number;
    lastMessageAt?: string | null;
  };
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const { contact, lastMessage, unreadCount, lastMessageAt } = conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-start transition-colors",
        "hover:bg-[#F1F5F9] dark:hover:bg-white/5 rounded-[12px]",
        isActive && "bg-[#EBF9FC] dark:bg-[#57BBCE]/10"
      )}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="relative shrink-0">
        <UserAvatar
          displayName={contact.displayName}
          avatarUrl={contact.avatarUrl || undefined}
          size="md"
        />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -end-1 h-4 w-4 rounded-full bg-[#57BBCE] text-white text-[10px] font-bold flex items-center justify-center"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {contact.displayName}
          </span>
          {lastMessageAt && (
            <span className="text-[11px] text-neutral-400 shrink-0 ms-2">
              {timeAgo(lastMessageAt)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={cn(
              "text-xs truncate mt-0.5",
              unreadCount > 0
                ? "text-neutral-900 dark:text-neutral-100 font-medium"
                : "text-neutral-500"
            )}
          >
            {lastMessage.content}
          </p>
        )}
        {contact.headline && !lastMessage && (
          <p className="text-xs text-neutral-400 truncate mt-0.5">
            {contact.headline}
          </p>
        )}
      </div>
    </button>
  );
}
