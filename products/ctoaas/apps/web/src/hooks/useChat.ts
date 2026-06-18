"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type {
  ChatMessage,
  FeedbackType,
  SendMessageResponse,
  ConversationDetail,
} from "@/types/chat";

/**
 * Hook for managing chat state: messages, sending, feedback.
 * [US-01][FR-001][FR-002]
 */
export function useChat(initialConversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<ConversationDetail>(
      `/conversations/${convId}`
    );
    if (response.success && response.data) {
      setMessages(response.data.messages);
      setConversationId(convId);
    } else {
      setError(response.error?.message ?? "Failed to load conversation");
    }
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await apiClient.post<SendMessageResponse>(
        "/conversations",
        {
          message: content,
          conversationId,
        }
      );

      if (response.success && response.data) {
        setConversationId(response.data.conversationId);
        // Replace temp message and add assistant response
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMessage.id);
          return [...withoutTemp, response.data!.message];
        });
      } else {
        setError(response.error?.message ?? "Failed to send message");
        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMessage.id)
        );
      }
      setIsLoading(false);
    },
    [conversationId]
  );

  const sendFeedback = useCallback(
    async (messageId: string, type: FeedbackType) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedback: type } : m
        )
      );
      // Fire and forget - update server
      await apiClient.post(`/conversations/messages/${messageId}/feedback`, {
        type,
      });
    },
    []
  );

  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    sendFeedback,
    loadConversation,
    resetChat,
  };
}
