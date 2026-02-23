"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthContext } from "@/providers/AuthProvider";
import { getAccessToken } from "@/lib/auth";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws").replace(/\/api\/v1$/, "")
    : "ws://localhost:5007");

export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

type MessageHandler = (msg: WsMessage) => void;

/**
 * WebSocket hook for real-time messaging.
 * Connects when user is authenticated, reconnects on disconnect.
 */
export function useWebSocket() {
  const { isAuthenticated } = useAuthContext();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        for (const handler of handlersRef.current) {
          handler(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (getAccessToken()) {
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), 3000);
      }
    };

    ws.onerror = () => {
      // Will trigger onclose
    };
  }, []);

  // Keep ref in sync so the onclose callback always calls the latest connect
  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  // Keepalive ping every 30s
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, subscribe, send };
}
