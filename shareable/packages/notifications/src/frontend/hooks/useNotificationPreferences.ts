import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferencesApiClient {
  getPreferences(): Promise<Record<string, boolean>>;
  updatePreferences(updates: Record<string, boolean>): Promise<Record<string, boolean>>;
}

export function useNotificationPreferences(apiClient: NotificationPreferencesApiClient) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const prefs = await apiClient.getPreferences();
      setPreferences(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async (key: string) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await apiClient.updatePreferences({ [key]: updated[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Revert on failure
      setPreferences(preferences);
      setError(err instanceof Error ? err.message : 'Failed to update preference');
    }
  }, [apiClient, preferences]);

  const update = useCallback(async (updates: Record<string, boolean>) => {
    const prev = { ...preferences };
    setPreferences({ ...preferences, ...updates });
    try {
      const result = await apiClient.updatePreferences(updates);
      setPreferences(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setPreferences(prev);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  }, [apiClient, preferences]);

  return { preferences, isLoading, error, saved, toggle, update, reload: load };
}
