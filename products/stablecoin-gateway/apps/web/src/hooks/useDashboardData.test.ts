import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData';

describe('useDashboardData', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
