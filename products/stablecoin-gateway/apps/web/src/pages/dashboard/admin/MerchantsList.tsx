import { useAdminMerchants } from '../../../hooks/useAdminMerchants';
import { Link } from 'react-router-dom';
import { useState } from 'react';

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
  });
}

function StatusBadges({ summary }: { summary: Record<string, number> }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    CONFIRMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(summary).map(([status, count]) => (
        <span
          key={status}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}
        >
          {count} {status.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export default function MerchantsList() {
  const {
    merchants,
    isLoading,
    error,
    total,
    hasMore,
    search,
    setSearch,
    page,
    setPage,
  } = useAdminMerchants();

  const [searchInput, setSearchInput] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">All Merchants</h2>
          <p className="text-sm text-text-secondary">{total} total merchants</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email..."
            className="px-3 py-2 rounded-lg border border-card-border bg-card-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Email
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Signed Up
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Payments
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Volume
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                  Loading merchants...
                </td>
              </tr>
            ) : merchants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                  No merchants found
                </td>
              </tr>
            ) : (
              merchants.map((m) => (
                <tr key={m.id} className="border-b border-card-border last:border-b-0 hover:bg-sidebar-hover/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">{m.email}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(m.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-text-primary text-right">{m.payment_count}</td>
                  <td className="px-6 py-4 text-sm text-text-primary text-right font-medium">
                    {formatCurrency(m.total_volume)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadges summary={m.status_summary} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/dashboard/admin/merchants/${m.id}/payments`}
                      className="text-sm text-accent-blue hover:underline font-medium"
                    >
                      View
                    </Link>
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
          Showing {merchants.length} of {total}
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
