import { useState, useEffect, useCallback } from 'react';
import { apiClient, NotificationPreferences, ApiClientError } from '../lib/api-client';

interface UseSettingsReturn {
  notifications: NotificationPreferences | null;
  isLoadingNotifications: boolean;
  notificationError: string | null;
  saveNotifications: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

export function useSettings(): UseSettingsReturn {
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const prefs = await apiClient.getNotificationPreferences();
        if (!cancelled) {
          setNotifications(prefs);
          setNotificationError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setNotificationError(err instanceof ApiClientError ? err.detail : 'Failed to load notification preferences');
        }
      } finally {
        if (!cancelled) setIsLoadingNotifications(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const saveNotifications = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const updated = await apiClient.updateNotificationPreferences(prefs);
      setNotifications(updated);
      return true;
    } catch {
      return false;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.detail : 'Failed to change password';
      return { success: false, error: msg };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await apiClient.deleteAccount();
      return { success: true };
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.detail : 'Failed to delete account';
      return { success: false, error: msg };
    }
  }, []);

  return {
    notifications,
    isLoadingNotifications,
    notificationError,
    saveNotifications,
    changePassword,
    deleteAccount,
  };
}
