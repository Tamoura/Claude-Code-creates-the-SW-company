"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Conversation, ConversationsResponse } from "@/types/chat";

/**
 * Hook to fetch the list of past conversations.
 * [US-04][FR-006]
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response =
      await apiClient.get<ConversationsResponse>("/conversations");
    if (response.success && response.data) {
      setConversations(response.data.conversations);
    } else {
      setError(
        response.error?.message ?? "Failed to load conversations"
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, isLoading, error, refetch: fetchConversations };
}
