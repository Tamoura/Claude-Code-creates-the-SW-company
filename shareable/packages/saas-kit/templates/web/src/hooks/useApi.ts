import { useState, useCallback } from 'react';

const API_BASE = '/api/v1';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export function useApi() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
    setLoading(true);
    try {
      const { method = 'GET', body, headers = {} } = options;
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Request failed: ${res.status}`);
      }

      return res.json() as Promise<T>;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading };
}
