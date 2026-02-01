import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api-client';
import type { MerchantPayment } from '../../../lib/api-client';

const PAGE_SIZE = 20;

const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CONFIRMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function MerchantPayments() {
  const { id } = useParams<{ id: string }>();
  const [payments, setPayments] = useState<MerchantPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.getMerchantPayments(id, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setPayments(result.data);
      setTotal(result.pagination.total);
      setHasMore(result.pagination.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [id, page, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/dashboard/admin/merchants"
          className="text-sm text-accent-blue hover:underline"
        >
          &larr; Back to Merchants
        </Link>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/dashboard/admin/merchants"
            className="text-sm text-accent-blue hover:underline"
          >
            &larr; Back to Merchants
          </Link>
          <h2 className="text-lg font-semibold text-text-primary mt-1">
            Merchant Payments
          </h2>
          <p className="text-sm text-text-secondary">{total} payments</p>
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-accent-blue text-white border-accent-blue'
                  : 'border-card-border bg-card-bg text-text-secondary hover:bg-sidebar-hover'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                ID
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Date
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Asset
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Tx Hash
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                  Loading payments...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-card-border last:border-b-0 hover:bg-sidebar-hover/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                    {p.id.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary text-right font-medium">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {p.token} / {p.network}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[p.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                    {p.tx_hash ? `${p.tx_hash.substring(0, 10)}...` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Showing {payments.length} of {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-card-border bg-card-bg text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sidebar-hover transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
            className="px-3 py-1.5 text-sm rounded-lg border border-card-border bg-card-bg text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sidebar-hover transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
