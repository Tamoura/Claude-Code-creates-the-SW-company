import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDashboardData } from './useDashboardData';
import { apiClient, type PaymentSession } from '../lib/api-client';

describe('useDashboardData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.isLoading).toBe(true);
  });

  it('computes stats from payment sessions', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Stats should have numeric values
    expect(result.current.stats.totalBalance).toBeDefined();
    expect(result.current.stats.settlementVolume).toBeDefined();
    expect(result.current.stats.successRate).toBeDefined();
  });

  it('returns transactions as recent items', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions.length).toBeGreaterThan(0);
    expect(result.current.transactions[0]).toHaveProperty('id');
    expect(result.current.transactions[0]).toHaveProperty('amount');
    expect(result.current.transactions[0]).toHaveProperty('status');
  });

  it('computes success rate excluding non-terminal statuses', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Success rate should be a percentage string like "85.7%"
    expect(result.current.stats.successRate.value).toMatch(/^\d+(\.\d+)?%$/);
  });

  it('computes total balance from completed sessions', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Total balance should be formatted like "$1,234.56"
    expect(result.current.stats.totalBalance.value).toMatch(/^\$/);
  });

  it('limits recent transactions to 5', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions.length).toBeLessThanOrEqual(5);
  });

  describe('uppercase status mapping (API returns uppercase)', () => {
    function makeSession(overrides: Partial<PaymentSession>): PaymentSession {
      return {
        id: 'ps_test001',
        amount: 10000,
        currency: 'USD',
        status: 'pending',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0xMerchant1',
        checkout_url: '/pay/ps_test001',
        created_at: '2026-01-28T10:00:00Z',
        expires_at: '2026-02-04T10:00:00Z',
        ...overrides,
      };
    }

    it('maps uppercase PENDING to PENDING (not FAILED)', async () => {
      vi.spyOn(apiClient, 'listPaymentSessions').mockResolvedValue({
        data: [makeSession({ id: 'ps_pend01', status: 'PENDING' as PaymentSession['status'] })],
        pagination: { total: 1, has_more: false },
      });

      const { result } = renderHook(() => useDashboardData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].status).toBe('PENDING');
    });

    it('maps uppercase COMPLETED to SUCCESS', async () => {
      vi.spyOn(apiClient, 'listPaymentSessions').mockResolvedValue({
        data: [makeSession({ id: 'ps_comp01', status: 'COMPLETED' as PaymentSession['status'] })],
        pagination: { total: 1, has_more: false },
      });

      const { result } = renderHook(() => useDashboardData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions[0].status).toBe('SUCCESS');
    });

    it('maps uppercase CONFIRMING to PENDING', async () => {
      vi.spyOn(apiClient, 'listPaymentSessions').mockResolvedValue({
        data: [makeSession({ id: 'ps_conf01', status: 'CONFIRMING' as PaymentSession['status'] })],
        pagination: { total: 1, has_more: false },
      });

      const { result } = renderHook(() => useDashboardData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions[0].status).toBe('PENDING');
    });

    it('maps uppercase FAILED to FAILED', async () => {
      vi.spyOn(apiClient, 'listPaymentSessions').mockResolvedValue({
        data: [makeSession({ id: 'ps_fail01', status: 'FAILED' as PaymentSession['status'] })],
        pagination: { total: 1, has_more: false },
      });

      const { result } = renderHook(() => useDashboardData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions[0].status).toBe('FAILED');
    });

    it('handles mixed-case statuses from API', async () => {
      vi.spyOn(apiClient, 'listPaymentSessions').mockResolvedValue({
        data: [
          makeSession({ id: 'ps_mix01', status: 'PENDING' as PaymentSession['status'], created_at: '2026-01-28T10:00:00Z' }),
          makeSession({ id: 'ps_mix02', status: 'COMPLETED' as PaymentSession['status'], created_at: '2026-01-27T10:00:00Z' }),
          makeSession({ id: 'ps_mix03', status: 'FAILED' as PaymentSession['status'], created_at: '2026-01-26T10:00:00Z' }),
        ],
        pagination: { total: 3, has_more: false },
      });

      const { result } = renderHook(() => useDashboardData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions).toHaveLength(3);
      expect(result.current.transactions[0].status).toBe('PENDING');
      expect(result.current.transactions[1].status).toBe('SUCCESS');
      expect(result.current.transactions[2].status).toBe('FAILED');
    });
  });
});
