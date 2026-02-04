import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRefunds } from './useRefunds';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    listRefunds: vi.fn(),
    createRefund: vi.fn(),
    getRefund: vi.fn(),
  },
  ApiClientError: class extends Error {
    detail: string;
    constructor(s: number, t: string, d: string) { super(d); this.detail = d; }
  },
}));

describe('useRefunds', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('loads refunds on mount', async () => {
    vi.mocked(apiClient.listRefunds).mockResolvedValueOnce({
      data: [
        { id: 'ref_1', payment_session_id: 'ps_1', amount: 50, status: 'COMPLETED', created_at: '2026-01-01' },
      ],
      pagination: { total: 1, has_more: false },
    });
    const { result } = renderHook(() => useRefunds());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.refunds).toHaveLength(1);
    expect(result.current.totalCount).toBe(1);
  });

  it('handles loading error', async () => {
    vi.mocked(apiClient.listRefunds).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useRefunds());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.error).toBeTruthy();
  });

  it('creates a refund', async () => {
    vi.mocked(apiClient.listRefunds).mockResolvedValueOnce({ data: [], pagination: { total: 0, has_more: false } });
    vi.mocked(apiClient.createRefund).mockResolvedValueOnce({
      id: 'ref_new', payment_session_id: 'ps_1', amount: 25, status: 'PENDING', created_at: '2026-01-02',
    });
    const { result } = renderHook(() => useRefunds());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    let res: any;
    await act(async () => {
      res = await result.current.createRefund({ payment_session_id: 'ps_1', amount: 25 });
    });
    expect(res.success).toBe(true);
    expect(result.current.refunds).toHaveLength(1);
  });

  it('filters by status', async () => {
    vi.mocked(apiClient.listRefunds).mockResolvedValue({ data: [], pagination: { total: 0, has_more: false } });
    const { result } = renderHook(() => useRefunds());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => { result.current.setStatusFilter('PENDING'); });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(apiClient.listRefunds).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  it('handles create refund failure', async () => {
    vi.mocked(apiClient.listRefunds).mockResolvedValueOnce({ data: [], pagination: { total: 0, has_more: false } });
    vi.mocked(apiClient.createRefund).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useRefunds());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    let res: any;
    await act(async () => {
      res = await result.current.createRefund({ payment_session_id: 'ps_1', amount: 25 });
    });
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
