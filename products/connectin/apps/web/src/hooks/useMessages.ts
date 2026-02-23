"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import { useWebSocket, type WsMessage } from "./useWebSocket";

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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { subscribe, isConnected } = useWebSocket();

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
      // silent
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

  const sendTyping = useCallback(
    async (convId: string) => {
      try {
        await apiClient.post(`/conversations/${convId}/typing`, {});
      } catch {
        // silent
      }
    },
    []
  );

  // WebSocket message handler — live message delivery
  useEffect(() => {
    const unsubscribe = subscribe((msg: WsMessage) => {
      if (msg.type === "message:new") {
        const newMsg = msg.payload as unknown as ApiMessage;
        // Add to messages list if we're viewing this conversation
        if (conversationId && newMsg.conversationId === conversationId) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newMsg.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    content: newMsg.content,
                    createdAt: newMsg.createdAt,
                    isRead: false,
                    senderId: newMsg.senderId,
                  },
                  lastMessageAt: newMsg.createdAt,
                  unreadCount:
                    newMsg.conversationId !== conversationId
                      ? c.unreadCount + 1
                      : c.unreadCount,
                }
              : c
          )
        );
      }

      if (msg.type === "message:read") {
        const { messageId, readAt } = msg.payload as {
          messageId: string;
          readAt: string;
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, readAt } : m))
        );
      }

      if (msg.type === "typing:start") {
        const { userId, conversationId: typingConvId } = msg.payload as {
          userId: string;
          conversationId: string;
        };
        if (typingConvId === conversationId) {
          setTypingUsers((prev) => new Set(prev).add(userId));
          // Clear typing after 3s
          const existing = typingTimersRef.current.get(userId);
          if (existing) clearTimeout(existing);
          typingTimersRef.current.set(
            userId,
            setTimeout(() => {
              setTypingUsers((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
              });
              typingTimersRef.current.delete(userId);
            }, 3000)
          );
        }
      }

      if (
        msg.type === "presence:online" ||
        msg.type === "presence:offline"
      ) {
        // Could update conversation contact online status here
        // For now, the presence API is available for polling
      }
    });

    return unsubscribe;
  }, [subscribe, conversationId]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setTypingUsers(new Set());
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  // Fallback polling when WebSocket is not connected (every 5s)
  useEffect(() => {
    if (isConnected || !conversationId) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      fetchMessages(conversationId);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, fetchMessages, isConnected]);

  return {
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    typingUsers,
    isConnected,
    sendMessage,
    sendTyping,
    markRead,
    refetchConversations: fetchConversations,
    refetchMessages: () => conversationId && fetchMessages(conversationId),
  };
}
