import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiClientError } from '../lib/api-client';

export interface Session {
  id: string;
  created_at: string;
  expires_at: string;
}

interface UseSessionsReturn {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  revokeSession: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.listSessions();
      setSessions(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.detail : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const revokeSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { sessions, isLoading, error, revokeSession, refresh: loadSessions };
}
