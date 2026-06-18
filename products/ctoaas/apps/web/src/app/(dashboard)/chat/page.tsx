"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";

/**
 * Main chat page with conversation sidebar, message list, and input area.
 * [US-01][US-04][FR-001][FR-002][FR-006]
 */
export default function ChatPage() {
  const router = useRouter();
  const {
    messages,
    isLoading: isSending,
    error,
    sendMessage,
    sendFeedback,
    resetChat,
  } = useChat();

  const {
    conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useConversations();

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content);
      refetchConversations();
    },
    [sendMessage, refetchConversations]
  );

  const handleNewConversation = useCallback(() => {
    resetChat();
    router.push("/chat");
  }, [resetChat, router]);

  return (
    <div className="h-[calc(100vh-4rem)] flex -m-8">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={null}
        onNewConversation={handleNewConversation}
        isLoading={isLoadingConversations}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background">
          <h1 className="text-xl font-bold text-foreground">
            AI CTO Advisor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Strategic technology guidance tailored to your organization
          </p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !isSending && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Start a conversation
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask about technology strategy, architecture decisions,
                  team scaling, or engineering best practices.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Review my architecture",
                    "Technology recommendations",
                    "Team scaling advice",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSend(suggestion)}
                      className="px-3 py-1.5 text-sm bg-background border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[36px] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onFeedback={sendFeedback}
            />
          ))}

          {isSending && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 rounded-xl px-4 py-3 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mx-auto max-w-md p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center"
            >
              {error}
            </div>
          )}
        </div>

        {/* Input area */}
        <ChatInput onSend={handleSend} isLoading={isSending} />
      </div>
    </div>
  );
}
