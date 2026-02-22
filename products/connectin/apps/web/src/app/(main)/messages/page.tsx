"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { t } = useTranslation("common");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");

  const {
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    sendMessage,
  } = useMessages(activeConvId);

  const filtered = conversations.filter((c) =>
    c.contact.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const handleSend = async () => {
    if (!activeConvId || !inputValue.trim()) return;
    const ok = await sendMessage(activeConvId, inputValue);
    if (ok) setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-4">
      {/* Conversation List */}
      <div className="w-[320px] shrink-0 rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-white/8">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {t("messages.inbox")}
          </h1>
          <input
            type="text"
            aria-label={t("messages.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("messages.search")}
            className="mt-3 w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingConversations && conversations.length === 0 ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-[#F1F5F9] dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-neutral-400">{t("messages.noConversations")}</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConvId}
                onClick={() => setActiveConvId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-md flex flex-col overflow-hidden">
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-white/8 flex items-center gap-3">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {activeConv.contact.displayName}
                </p>
                {activeConv.contact.headline && (
                  <p className="text-xs text-neutral-400">{activeConv.contact.headline}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2"
              role="log"
              aria-label="Messages"
              aria-live="polite"
            >
              {isLoadingMessages && messages.length === 0 ? (
                <div
                  role="status"
                  aria-busy="true"
                  className="flex items-center justify-center h-full"
                >
                  <div className="h-8 w-8 rounded-full border-2 border-[#57BBCE] border-t-transparent animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-neutral-400">{t("messages.emptyThread")}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-[#E2E8F0] dark:border-white/8">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("messages.typeMessage")}
                  aria-label={t("messages.typeMessage")}
                  disabled={isSending}
                  className="flex-1 rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  aria-label={t("messages.send")}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    "bg-[#57BBCE] text-white hover:bg-[#4AAEC1]",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-400">{t("messages.startConversation")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
