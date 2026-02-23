"use client";

import { cn } from "@/lib/utils";
import { useAuthContext } from "@/providers/AuthProvider";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    sender?: { userId: string; displayName: string; avatarUrl?: string };
    content: string;
    createdAt: string;
    readAt?: string | null;
  };
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuthContext();
  const isMine = message.senderId === user?.id || message.senderId === "me";

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isMine ? "self-end flex-row-reverse" : "self-start"
      )}
    >
      <div
        className={cn(
          "px-4 py-2.5 rounded-[18px] text-sm",
          isMine
            ? "bg-[#57BBCE] text-white rounded-br-md"
            : "bg-[#F1F5F9] dark:bg-white/10 text-neutral-900 dark:text-neutral-100 rounded-bl-md"
        )}
      >
        <p className="break-words">{message.content}</p>
        <div
          className={cn(
            "text-[10px] mt-1",
            isMine ? "text-white/70 text-right" : "text-neutral-500"
          )}
        >
          {formatTime(message.createdAt)}
          {isMine && message.readAt && (
            <span className="ms-1" aria-label="Read">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
