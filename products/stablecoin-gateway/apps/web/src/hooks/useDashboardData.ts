import { useState, useEffect } from 'react';
import { apiClient, type PaymentSession } from '../lib/api-client';
import { mockPaymentSessions } from '../data/dashboard-mock';

export interface DashboardStat {
  title: string;
  value: string;
  trend?: string;
  subtitle?: string;
}

export interface DashboardTransaction {
  id: string;
  customer: string;
  date: string;
  amount: string;
  asset: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapStatus(status: PaymentSession['status']): DashboardTransaction['status'] {
  switch (status) {
    case 'completed': return 'SUCCESS';
    case 'pending':
    case 'confirming': return 'PENDING';
    default: return 'FAILED';
  }
}

function computeStats(sessions: PaymentSession[]) {
  const completed = sessions.filter(s => s.status === 'completed');
  const terminal = sessions.filter(s => s.status === 'completed' || s.status === 'failed');

  const totalBalance = completed.reduce((sum, s) => sum + s.amount, 0);
  const volume = sessions.reduce((sum, s) => sum + s.amount, 0);
  const rate = terminal.length > 0
    ? (completed.length / terminal.length) * 100
    : 0;

  return {
    totalBalance: {
      title: 'Total Balance',
      value: formatCurrency(totalBalance),
      trend: '+12.5% this week',
    } as DashboardStat,
    settlementVolume: {
      title: 'Settlement Volume',
      value: formatCurrency(volume),
      trend: '+4.2% this week',
    } as DashboardStat,
    successRate: {
      title: 'Success Rate',
      value: `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`,
      subtitle: 'Based on terminal payments',
    } as DashboardStat,
  };
}

function toTransactions(sessions: PaymentSession[]): DashboardTransaction[] {
  return sessions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(s => ({
      id: `#${s.id.replace('ps_', 'TX-').toUpperCase()}`,
      customer: s.customer_address || 'Unknown',
      date: formatDate(s.created_at),
      amount: formatCurrency(s.amount),
      asset: s.token,
      status: mapStatus(s.status),
    }));
}

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<PaymentSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await apiClient.listPaymentSessions();
        if (!cancelled) {
          setSessions(result.data);
        }
      } catch {
        // Fallback to mock data on error
        if (!cancelled) {
          setSessions(mockPaymentSessions);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return {
    isLoading,
    stats: computeStats(sessions),
    transactions: toTransactions(sessions),
  };
}
