import { useState, useEffect } from 'react';
import { apiClient, type AnalyticsOverview, type VolumeDataPoint, type BreakdownItem } from '../lib/api-client';

export interface UseAnalyticsResult {
  overview: AnalyticsOverview | null;
  volume: VolumeDataPoint[];
  breakdown: BreakdownItem[];
  isLoading: boolean;
  error: string | null;
  period: string;
  setPeriod: (p: string) => void;
  days: number;
  setDays: (d: number) => void;
  groupBy: string;
  setGroupBy: (g: string) => void;
}

export function useAnalytics(): UseAnalyticsResult {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [volume, setVolume] = useState<VolumeDataPoint[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('day');
  const [days, setDays] = useState(30);
  const [groupBy, setGroupBy] = useState('status');

  // Load overview on mount
  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const data = await apiClient.getAnalyticsOverview();
        if (!cancelled) {
          setOverview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load overview');
        }
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load volume data when period or days change
  useEffect(() => {
    let cancelled = false;

    async function loadVolume() {
      try {
        const data = await apiClient.getAnalyticsVolume(period, days);
        if (!cancelled) {
          setVolume(data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load volume data');
        }
      }
    }

    loadVolume();
    return () => {
      cancelled = true;
    };
  }, [period, days]);

  // Load breakdown when groupBy changes
  useEffect(() => {
    let cancelled = false;

    async function loadBreakdown() {
      try {
        const data = await apiClient.getAnalyticsBreakdown(groupBy);
        if (!cancelled) {
          setBreakdown(data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load breakdown data');
        }
      }
    }

    loadBreakdown();
    return () => {
      cancelled = true;
    };
  }, [groupBy]);

  // Set loading to false once all initial data is loaded
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        await Promise.all([
          apiClient.getAnalyticsOverview(),
          apiClient.getAnalyticsVolume(period, days),
          apiClient.getAnalyticsBreakdown(groupBy),
        ]);
        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load analytics data');
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [period, days, groupBy]);

  return {
    overview,
    volume,
    breakdown,
    isLoading,
    error,
    period,
    setPeriod,
    days,
    setDays,
    groupBy,
    setGroupBy,
  };
}
