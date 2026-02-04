import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import * as apiClientModule from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    getAnalyticsOverview: vi.fn(),
    getAnalyticsVolume: vi.fn(),
    getAnalyticsBreakdown: vi.fn(),
  },
}));

describe('useAnalytics', () => {
  const mockApiClient = apiClientModule.apiClient as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockApiClient.getAnalyticsOverview.mockImplementation(() => new Promise(() => {}));
    mockApiClient.getAnalyticsVolume.mockImplementation(() => new Promise(() => {}));
    mockApiClient.getAnalyticsBreakdown.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.overview).toBeNull();
    expect(result.current.volume).toEqual([]);
    expect(result.current.breakdown).toEqual([]);
  });

  it('loads overview data on mount', async () => {
    const mockOverview = {
      total_payments: 150,
      total_volume: 45000.0,
      successful_payments: 142,
      success_rate: 94.67,
      average_payment: 300.0,
      total_refunds: 3,
      refund_rate: 2.0,
    };

    mockApiClient.getAnalyticsOverview.mockResolvedValue(mockOverview);
    mockApiClient.getAnalyticsVolume.mockResolvedValue({ data: [], period: 'day', days: 30 });
    mockApiClient.getAnalyticsBreakdown.mockResolvedValue({ data: [], group_by: 'status' });

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overview).toEqual(mockOverview);
  });

  it('loads volume data with default period', async () => {
    const mockVolume = {
      data: [
        { date: '2025-01-01', volume: 1200.5, count: 5 },
        { date: '2025-01-02', volume: 2400.0, count: 8 },
      ],
      period: 'day',
      days: 30,
    };

    mockApiClient.getAnalyticsOverview.mockResolvedValue({
      total_payments: 0,
      total_volume: 0,
      successful_payments: 0,
      success_rate: 0,
      average_payment: 0,
      total_refunds: 0,
      refund_rate: 0,
    });
    mockApiClient.getAnalyticsVolume.mockResolvedValue(mockVolume);
    mockApiClient.getAnalyticsBreakdown.mockResolvedValue({ data: [], group_by: 'status' });

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.volume).toEqual(mockVolume.data);
    expect(result.current.period).toBe('day');
    expect(result.current.days).toBe(30);
  });

  it('changes breakdown when groupBy changes', async () => {
    const mockBreakdown = {
      data: [
        { label: 'completed', count: 142, volume: 42600.0 },
        { label: 'pending', count: 8, volume: 2400.0 },
      ],
      group_by: 'status',
    };

    mockApiClient.getAnalyticsOverview.mockResolvedValue({
      total_payments: 0,
      total_volume: 0,
      successful_payments: 0,
      success_rate: 0,
      average_payment: 0,
      total_refunds: 0,
      refund_rate: 0,
    });
    mockApiClient.getAnalyticsVolume.mockResolvedValue({ data: [], period: 'day', days: 30 });
    mockApiClient.getAnalyticsBreakdown.mockResolvedValue(mockBreakdown);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.breakdown).toEqual(mockBreakdown.data);
    expect(result.current.groupBy).toBe('status');

    // Change groupBy
    result.current.setGroupBy('network');

    const networkBreakdown = {
      data: [{ label: 'polygon', count: 100, volume: 30000.0 }],
      group_by: 'network',
    };
    mockApiClient.getAnalyticsBreakdown.mockResolvedValue(networkBreakdown);

    await waitFor(() => {
      expect(mockApiClient.getAnalyticsBreakdown).toHaveBeenCalledWith('network');
    });
  });

  it('handles API errors', async () => {
    mockApiClient.getAnalyticsOverview.mockRejectedValue(new Error('API Error'));
    mockApiClient.getAnalyticsVolume.mockRejectedValue(new Error('API Error'));
    mockApiClient.getAnalyticsBreakdown.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
