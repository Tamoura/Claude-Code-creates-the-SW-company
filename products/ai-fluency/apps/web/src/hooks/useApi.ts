'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

// Generic hook for one-off API calls with loading/error state management.
// For data fetching, prefer TanStack Query (useQuery).
export function useApi<T>(
  apiFn: (...args: unknown[]) => Promise<T>,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await apiFn(...args);
        setState({ data: result, isLoading: false, error: null });
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'An unexpected error occurred.';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    [apiFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// Re-export api for convenience
export { api };
