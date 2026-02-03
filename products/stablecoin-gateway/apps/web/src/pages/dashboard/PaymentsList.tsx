import { useState, useMemo } from 'react';
import TransactionsTable, { type TransactionRow } from '../../components/dashboard/TransactionsTable';
import { useDashboardData } from '../../hooks/useDashboardData';

type StatusFilter = 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED';

const filters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Completed', value: 'SUCCESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

/**
 * Escapes a CSV field by wrapping it in quotes if it contains commas, quotes, or newlines
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Exports transactions to a CSV file and triggers download
 */
function exportToCSV(transactions: TransactionRow[], filename: string) {
  const headers = ['ID', 'Customer', 'Date', 'Amount', 'Asset', 'Status'];

  const rows = transactions.map(tx => [
    escapeCSVField(tx.id),
    escapeCSVField(tx.customer),
    escapeCSVField(tx.date),
    escapeCSVField(tx.amount),
    escapeCSVField(tx.asset),
    escapeCSVField(tx.status),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PaymentsList() {
  const { transactions, isLoading } = useDashboardData();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered: TransactionRow[] = useMemo(() => {
    let result = transactions;

    // Apply status filter
    if (activeFilter !== 'ALL') {
      result = result.filter(tx => tx.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tx => {
        return (
          tx.id.toLowerCase().includes(query) ||
          tx.customer.toLowerCase().includes(query) ||
          tx.amount.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [transactions, activeFilter, searchQuery]);

  const handleExportCSV = () => {
    const filename = `stableflow-payments-${formatDate(new Date())}.csv`;
    exportToCSV(filtered, filename);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Payment History</h2>
        <p className="text-text-secondary">
          View and manage all your payment transactions
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-text-muted" />
        </div>
        <input
          type="text"
          placeholder="Search by description or tx hash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card-bg border border-card-border rounded-lg px-4 py-2.5 pl-11 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
        />
      </div>

      {/* Filter Buttons and Export CSV */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                activeFilter === f.value
                  ? 'bg-accent-blue text-white border-accent-blue'
                  : 'text-text-secondary border-card-border hover:text-text-primary hover:border-text-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 border border-card-border rounded-lg px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-text-muted">
        Showing {filtered.length} of {transactions.length} payments
      </div>

      <TransactionsTable transactions={filtered} isLoading={isLoading} />
    </div>
  );
}
