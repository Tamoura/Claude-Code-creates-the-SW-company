"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Connection, PendingRequest } from "@/types";

interface PendingResponse {
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
}

/**
 * Connections data hook for ConnectIn.
 * Fetches accepted connections and pending requests (incoming/outgoing).
 * Provides accept and reject actions with optimistic local state updates.
 */
export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<PendingRequest[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connectionsRes, pendingRes] = await Promise.all([
        apiClient.get<Connection[]>("/connections"),
        apiClient.get<PendingResponse>("/connections/pending"),
      ]);

      if (connectionsRes.success && connectionsRes.data) {
        setConnections(connectionsRes.data);
      } else if (!connectionsRes.success) {
        setError(
          connectionsRes.error?.message || "Failed to load connections"
        );
      }

      if (pendingRes.success && pendingRes.data) {
        const pending = pendingRes.data as unknown as PendingResponse;
        setPendingIncoming(pending.incoming ?? []);
        setPendingOutgoing(pending.outgoing ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptConnection = useCallback(async (connectionId: string) => {
    const accepted = pendingIncoming.find(
      (r) => r.connectionId === connectionId
    );

    // Optimistic update: remove from pending, add to connections
    setPendingIncoming((prev) =>
      prev.filter((r) => r.connectionId !== connectionId)
    );
    if (accepted) {
      const newConnection: Connection = {
        userId: accepted.user.id,
        displayName: accepted.user.displayName,
        avatarUrl: accepted.user.avatarUrl,
        headline: accepted.user.headlineEn,
        status: "connected",
      };
      setConnections((prev) => [...prev, newConnection]);
    }

    try {
      const response = await apiClient.put(`/connections/${connectionId}/accept`);
      if (!response.success) {
        // Revert on failure
        if (accepted) {
          setPendingIncoming((prev) => [...prev, accepted]);
          setConnections((prev) =>
            prev.filter((c) => c.userId !== accepted.user.id)
          );
        }
      }
    } catch {
      // Revert on network error
      if (accepted) {
        setPendingIncoming((prev) => [...prev, accepted]);
        setConnections((prev) =>
          prev.filter((c) => c.userId !== accepted.user.id)
        );
      }
    }
  }, [pendingIncoming]);

  const rejectConnection = useCallback(async (connectionId: string) => {
    const rejected = pendingIncoming.find(
      (r) => r.connectionId === connectionId
    );

    // Optimistic update: remove from pending
    setPendingIncoming((prev) =>
      prev.filter((r) => r.connectionId !== connectionId)
    );

    try {
      const response = await apiClient.delete(
        `/connections/${connectionId}/reject`
      );
      if (!response.success && rejected) {
        // Revert on failure
        setPendingIncoming((prev) => [...prev, rejected]);
      }
    } catch {
      // Revert on network error
      if (rejected) {
        setPendingIncoming((prev) => [...prev, rejected]);
      }
    }
  }, [pendingIncoming]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    error,
    acceptConnection,
    rejectConnection,
    refetch: fetchConnections,
  };
}
