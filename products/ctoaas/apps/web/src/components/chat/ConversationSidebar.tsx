"use client";

import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import type { Conversation } from "@/types/chat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewConversation: () => void;
  isLoading: boolean;
}

/**
 * Sidebar listing past conversations with active state highlighting
 * and a "New Conversation" button at the top.
 * [US-04][FR-006]
 */
export function ConversationSidebar({
  conversations,
  activeId,
  onNewConversation,
  isLoading,
}: ConversationSidebarProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 border-r border-border bg-muted/20 flex flex-col h-full">
      {/* New Conversation button */}
      <div className="p-3 border-b border-border">
        <button
          type="button"
          onClick={onNewConversation}
          aria-label="New conversation"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Conversation
        </button>
      </div>

      {/* Conversation list */}
      <nav
        className="flex-1 overflow-y-auto p-2 space-y-1"
        aria-label="Conversations"
      >
        {isLoading && (
          <p className="text-sm text-muted-foreground p-3 text-center">
            Loading conversations...
          </p>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="text-sm text-muted-foreground p-3 text-center">
            No conversations yet
          </p>
        )}

        {!isLoading &&
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                data-testid={`conversation-${conv.id}`}
                className={`block px-3 py-2 rounded-lg text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors ${
                  isActive
                    ? "bg-primary-100 text-primary-700"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(conv.updatedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
