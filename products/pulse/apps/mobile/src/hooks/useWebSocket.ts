import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import type { ActivityEvent, WebSocketMessage } from '../types';

const WS_URL = __DEV__
  ? 'ws://localhost:5003'
  : 'wss://api.pulse.connectsw.com';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 30000;

interface UseWebSocketOptions {
  room?: string;
  onEvent?: (event: ActivityEvent) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { room = 'activity', onEvent, enabled = true } = options;
  const token = useAuthStore((state) => state.token);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    cleanup();

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        setError(null);

        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', token }));

        // Subscribe to room
        ws.send(JSON.stringify({ type: 'subscribe', room }));

        setIsConnected(true);

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as WebSocketMessage;
          if (message.type === 'activity' && message.data && onEvent) {
            onEvent(message.data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (
          enabled &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttempts.current += 1;
          setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    } catch {
      setError('Failed to create WebSocket connection');
    }
  }, [token, room, onEvent, enabled, cleanup]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { isConnected, error, reconnect };
}
