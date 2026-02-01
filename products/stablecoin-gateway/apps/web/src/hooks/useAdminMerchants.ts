import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import type { MerchantSummary } from '../lib/api-client';

interface UseAdminMerchantsResult {
  merchants: MerchantSummary[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  search: string;
  setSearch: (s: string) => void;
  page: number;
  setPage: (p: number) => void;
  refresh: () => void;
}

const PAGE_SIZE = 20;

export function useAdminMerchants(): UseAdminMerchantsResult {
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const fetchMerchants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.listMerchants({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: search || undefined,
      });
      setMerchants(result.data);
      setTotal(result.pagination.total);
      setHasMore(result.pagination.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load merchants');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  return {
    merchants,
    isLoading,
    error,
    total,
    hasMore,
    search,
    setSearch,
    page,
    setPage,
    refresh: fetchMerchants,
  };
}
