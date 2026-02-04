import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
  ApiClientError: class extends Error {
    detail: string;
    constructor(s: number, t: string, d: string) {
      super(d);
      this.detail = d;
    }
  },
}));

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads notification preferences on mount', async () => {
    const mockPrefs = {
      id: 'pref_1',
      emailOnPaymentReceived: true,
      emailOnRefundProcessed: false,
      emailOnPaymentFailed: true,
      sendCustomerReceipt: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    vi.mocked(apiClient.getNotificationPreferences).mockResolvedValueOnce(mockPrefs);

    const { result } = renderHook(() => useSettings());

    expect(result.current.isLoadingNotifications).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingNotifications).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockPrefs);
    expect(result.current.notificationError).toBeNull();
  });

  it('handles notification loading error', async () => {
    vi.mocked(apiClient.getNotificationPreferences).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoadingNotifications).toBe(false);
    });

    expect(result.current.notificationError).toBeTruthy();
  });

  it('saves notification preferences', async () => {
    vi.mocked(apiClient.getNotificationPreferences).mockResolvedValueOnce({
      id: 'pref_1',
      emailOnPaymentReceived: true,
      emailOnRefundProcessed: false,
      emailOnPaymentFailed: true,
      sendCustomerReceipt: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    vi.mocked(apiClient.updateNotificationPreferences).mockResolvedValueOnce({
      id: 'pref_1',
      emailOnPaymentReceived: false,
      emailOnRefundProcessed: false,
      emailOnPaymentFailed: true,
      sendCustomerReceipt: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoadingNotifications).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.saveNotifications({ emailOnPaymentReceived: false });
    });

    expect(success!).toBe(true);
    expect(result.current.notifications?.emailOnPaymentReceived).toBe(false);
  });

  it('changes password successfully', async () => {
    vi.mocked(apiClient.getNotificationPreferences).mockResolvedValueOnce({} as any);
    vi.mocked(apiClient.changePassword).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoadingNotifications).toBe(false);
    });

    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current.changePassword('old', 'new');
    });

    expect(res!.success).toBe(true);
  });

  it('handles change password failure', async () => {
    vi.mocked(apiClient.getNotificationPreferences).mockResolvedValueOnce({} as any);
    vi.mocked(apiClient.changePassword).mockRejectedValueOnce(new Error('Wrong password'));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoadingNotifications).toBe(false);
    });

    let res: { success: boolean; error?: string };
    await act(async () => {
      res = await result.current.changePassword('wrong', 'new');
    });

    expect(res!.success).toBe(false);
    expect(res!.error).toBeTruthy();
  });
});
