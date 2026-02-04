import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessions } from './useSessions';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
  },
  ApiClientError: class extends Error {
    detail: string;
    constructor(s: number, t: string, d: string) { super(d); this.detail = d; }
  },
}));

describe('useSessions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('loads sessions on mount', async () => {
    vi.mocked(apiClient.listSessions).mockResolvedValueOnce({
      data: [
        { id: 's1', created_at: '2026-01-01T00:00:00Z', expires_at: '2026-01-08T00:00:00Z' },
        { id: 's2', created_at: '2026-01-02T00:00:00Z', expires_at: '2026-01-09T00:00:00Z' },
      ],
    });
    const { result } = renderHook(() => useSessions());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('handles loading error', async () => {
    vi.mocked(apiClient.listSessions).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useSessions());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.error).toBeTruthy();
  });

  it('revokes a session', async () => {
    vi.mocked(apiClient.listSessions).mockResolvedValueOnce({
      data: [{ id: 's1', created_at: '2026-01-01', expires_at: '2026-01-08' }, { id: 's2', created_at: '2026-01-02', expires_at: '2026-01-09' }],
    });
    vi.mocked(apiClient.revokeSession).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSessions());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    let success: boolean;
    await act(async () => { success = await result.current.revokeSession('s2'); });
    expect(success!).toBe(true);
    expect(result.current.sessions).toHaveLength(1);
  });

  it('handles revoke failure', async () => {
    vi.mocked(apiClient.listSessions).mockResolvedValueOnce({ data: [{ id: 's1', created_at: '', expires_at: '' }] });
    vi.mocked(apiClient.revokeSession).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useSessions());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    let success: boolean;
    await act(async () => { success = await result.current.revokeSession('s1'); });
    expect(success!).toBe(false);
    expect(result.current.sessions).toHaveLength(1);
  });
});
