"use client";

import { useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";

/**
 * Specific conversation view page.
 * Loads conversation history and continues the chat.
 * [US-01][US-04][FR-001][FR-006]
 */
export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const {
    messages,
    isLoading: isSending,
    error,
    sendMessage,
    sendFeedback,
    loadConversation,
    resetChat,
  } = useChat(conversationId);

  const {
    conversations,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useConversations();

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

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

  // Find current conversation title
  const currentConv = conversations.find((c) => c.id === conversationId);
  const title = currentConv?.title ?? "Conversation";

  return (
    <div className="h-[calc(100vh-4rem)] flex -m-8">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onNewConversation={handleNewConversation}
        isLoading={isLoadingConversations}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI CTO Advisor
          </p>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
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
