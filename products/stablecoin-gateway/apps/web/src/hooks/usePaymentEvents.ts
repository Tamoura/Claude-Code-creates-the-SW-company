import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UsePaymentEventsResult {
  status: string | null;
  confirmations: number;
  txHash: string | null;
  connectionState: ConnectionState;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
// RISK-070: Buffer before SSE token expiry to trigger refresh (2 minutes)
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Hook for managing SSE connection to payment session events
 *
 * @param paymentId - The payment session ID to monitor
 * @returns Object containing payment event data and connection controls
 *
 * @example
 * const { status, confirmations, connectionState } = usePaymentEvents('ps_123');
 */
export function usePaymentEvents(paymentId: string | undefined): UsePaymentEventsResult {
  const [status, setStatus] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<number | null>(null);
  // RISK-070: Track SSE token expiry to refresh before it expires
  const tokenRefreshTimerRef = useRef<number | null>(null);

  const disconnect = useCallback((preserveErrorState = false) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    // RISK-070: Clear token refresh timer
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    if (!preserveErrorState) {
      setConnectionState('disconnected');
    }
  }, []);

  const connect = useCallback(async () => {
    if (!paymentId) {
      setConnectionState('disconnected');
      return;
    }

    // Clean up existing connection
    disconnect();

    setConnectionState('connecting');
    setError(null);

    try {
      // RISK-070: Request SSE token and track its expiry for auto-refresh
      const { token: sseToken, expires_at } = await apiClient.requestSseToken(paymentId);
      const expiresAtMs = new Date(expires_at).getTime();

      // RISK-070: Validate token hasn't already expired (e.g. clock skew, slow network)
      if (expiresAtMs <= Date.now()) {
        throw new Error('SSE token already expired at issuance');
      }

      const refreshAt = expiresAtMs - TOKEN_REFRESH_BUFFER_MS;
      const refreshDelay = Math.max(refreshAt - Date.now(), 0);

      // Schedule a reconnect before the token expires
      if (refreshDelay > 0) {
        tokenRefreshTimerRef.current = window.setTimeout(() => {
          console.log('SSE token expiring soon, reconnecting...');
          connect();
        }, refreshDelay);
      }

      // RISK-070: Pass pre-fetched token to avoid double-fetch and ensure
      // the tracked expiry matches the token actually used
      const eventSource = await apiClient.createEventSource(paymentId, sseToken);
      eventSourceRef.current = eventSource;

      // Handle incoming messages
      eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) setStatus(data.status);
          if (data.confirmations !== undefined) setConfirmations(data.confirmations);
          if (data.tx_hash !== undefined) setTxHash(data.tx_hash);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      });

      // Handle error events from server
      eventSource.addEventListener('error', (event: Event) => {
        const messageEvent = event as MessageEvent;
        if (messageEvent.data) {
          try {
            const data = JSON.parse(messageEvent.data);
            setError(data.message || 'Connection error');
          } catch {
            setError('Connection error');
          }
        }
      });

      // Handle close events from server
      eventSource.addEventListener('close', (event: Event) => {
        const messageEvent = event as MessageEvent;
        if (messageEvent.data) {
          try {
            const data = JSON.parse(messageEvent.data);
            console.log('SSE connection closed:', data.message);
          } catch {
            console.log('SSE connection closed');
          }
        }
        disconnect();
      });

      // Handle EventSource errors (connection issues)
      eventSource.onerror = () => {
        setConnectionState('error');
        setError('Connection lost');
        disconnect(true); // Preserve error state

        // Attempt retry with exponential backoff
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          retryTimeoutRef.current = window.setTimeout(() => {
            console.log(`Reconnecting... (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
            connect();
          }, RETRY_DELAY);
        } else {
          setError('Maximum reconnection attempts reached');
        }
      };

      // Connection established
      setConnectionState('connected');
      retryCountRef.current = 0; // Reset retry counter on successful connection

    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setConnectionState('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [paymentId, disconnect]);

  // Auto-connect when paymentId is provided
  useEffect(() => {
    if (paymentId) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [paymentId, connect, disconnect]);

  return {
    status,
    confirmations,
    txHash,
    connectionState,
    error,
    connect,
    disconnect,
  };
}
