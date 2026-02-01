import { useState } from 'react';
import TransactionsTable, { type TransactionRow } from '../../components/dashboard/TransactionsTable';
import { useDashboardData } from '../../hooks/useDashboardData';

type StatusFilter = 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED';

const filters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Completed', value: 'SUCCESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
];

export default function PaymentsList() {
  const { transactions, isLoading } = useDashboardData();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');

  const filtered: TransactionRow[] =
    activeFilter === 'ALL'
      ? transactions
      : transactions.filter(tx => tx.status === activeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Payment History</h2>
        <p className="text-text-secondary">
          View and manage all your payment transactions
        </p>
      </div>

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

      <TransactionsTable transactions={filtered} isLoading={isLoading} />
    </div>
  );
}
