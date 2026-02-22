"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";

interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: { userId: string; displayName: string; avatarUrl?: string };
  content: string;
  createdAt: string;
  readAt?: string | null;
}

interface ApiConversation {
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
    senderId: string;
  } | null;
  unreadCount: number;
  lastMessageAt?: string | null;
}

interface ConversationsResponse {
  success: boolean;
  data: ApiConversation[];
  meta: { cursor: string | null; hasMore: boolean; count: number };
  error?: { message: string };
}

interface MessagesResponse {
  success: boolean;
  data: ApiMessage[];
  meta: { cursor: string | null; hasMore: boolean; count: number };
  error?: { message: string };
}

export function useMessages(conversationId?: string | null) {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = (await apiClient.get<ApiConversation[]>("/conversations", {
        params: { limit: "30" },
      })) as unknown as ConversationsResponse;
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch {
      // silent — conversations list is non-critical to show
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (convId: string, cursor?: string) => {
      setIsLoadingMessages(true);
      try {
        const params: Record<string, string> = { limit: "30" };
        if (cursor) params.cursor = cursor;
        const res = (await apiClient.get<ApiMessage[]>(
          `/conversations/${convId}/messages`,
          { params }
        )) as unknown as MessagesResponse;
        if (res.success && res.data) {
          if (cursor) {
            setMessages((prev) => [...res.data, ...prev]);
          } else {
            setMessages(res.data);
          }
        }
      } catch {
        setError("Error loading messages");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (convId: string, content: string): Promise<boolean> => {
      if (!content.trim()) return false;
      setIsSending(true);
      // Optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimistic: ApiMessage = {
        id: tempId,
        conversationId: convId,
        senderId: "me",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const res = await apiClient.post<ApiMessage>(
          "/conversations/messages",
          { conversationId: convId, content }
        );
        if (res.success && res.data) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? (res.data as ApiMessage) : m))
          );
          // Update conversation list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessage: {
                      content,
                      createdAt: new Date().toISOString(),
                      isRead: true,
                      senderId: "me",
                    },
                    lastMessageAt: new Date().toISOString(),
                  }
                : c
            )
          );
          return true;
        } else {
          // Remove optimistic on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return false;
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const markRead = useCallback(async (messageId: string) => {
    try {
      await apiClient.patch(`/conversations/messages/${messageId}/read`, {});
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  // Polling when a conversation is open (every 3 seconds)
  useEffect(() => {
    if (!conversationId) return;
    pollRef.current = setInterval(() => {
      fetchMessages(conversationId);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, fetchMessages]);

  return {
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    sendMessage,
    markRead,
    refetchConversations: fetchConversations,
    refetchMessages: () => conversationId && fetchMessages(conversationId),
  };
}
