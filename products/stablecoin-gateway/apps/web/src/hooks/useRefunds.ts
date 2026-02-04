import { useState, useEffect, useCallback } from 'react';
import { apiClient, Refund, CreateRefundRequest, ApiClientError } from '../lib/api-client';

interface UseRefundsReturn {
  refunds: Refund[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  createRefund: (data: CreateRefundRequest) => Promise<{ success: boolean; error?: string; refund?: Refund }>;
  refresh: () => Promise<void>;
  setStatusFilter: (status: string | undefined) => void;
  statusFilter: string | undefined;
}

export function useRefunds(): UseRefundsReturn {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const loadRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.listRefunds({ status: statusFilter, limit: 50 });
      setRefunds(response.data);
      setTotalCount(response.pagination.total);
      setHasMore(response.pagination.has_more);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.detail : 'Failed to load refunds');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const createRefund = useCallback(async (data: CreateRefundRequest) => {
    try {
      const refund = await apiClient.createRefund(data);
      setRefunds(prev => [refund, ...prev]);
      setTotalCount(prev => prev + 1);
      return { success: true, refund };
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.detail : 'Failed to create refund';
      return { success: false, error: msg };
    }
  }, []);

  return {
    refunds,
    isLoading,
    error,
    totalCount,
    hasMore,
    createRefund,
    refresh: loadRefunds,
    setStatusFilter,
    statusFilter,
  };
}
