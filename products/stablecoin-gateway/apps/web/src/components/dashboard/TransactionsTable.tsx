import { useNavigate } from 'react-router-dom';

export interface TransactionRow {
  id: string;
  rawId?: string; // The actual session ID (e.g., ps_abc123)
  customer: string;
  date: string;
  amount: string;
  asset: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

function StatusBadge({ status }: { status: TransactionRow['status'] }) {
  const styles = {
    SUCCESS: 'bg-green-500/15 text-accent-green border-green-500/30',
    PENDING: 'bg-yellow-500/15 text-accent-yellow border-yellow-500/30',
    FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  }[status];

  const ariaLabel = {
    SUCCESS: 'Transaction successful',
    PENDING: 'Transaction pending',
    FAILED: 'Transaction failed',
  }[status];

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
      aria-label={ariaLabel}
    >
      {status}
    </span>
  );
}

interface TransactionsTableProps {
  transactions?: TransactionRow[];
  isLoading?: boolean;
}

export default function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">Recent Transactions</h3>
        <button
          onClick={() => navigate('/dashboard/payments')}
          className="px-4 py-1.5 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
        >
          View All
        </button>
      </div>

      <div role="table" aria-label="Transactions" className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">ID</th>
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">Customer</th>
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">Date</th>
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">Amount</th>
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">Asset</th>
              <th scope="col" className="text-left px-6 py-3.5 text-text-muted font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  Loading transactions...
                </td>
              </tr>
            ) : !transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => tx.rawId && navigate(`/dashboard/payments/${tx.rawId}`)}
                  onKeyDown={(e) => {
                    if (tx.rawId && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      navigate(`/dashboard/payments/${tx.rawId}`);
                    }
                  }}
                  tabIndex={tx.rawId ? 0 : undefined}
                  role={tx.rawId ? 'link' : undefined}
                  className={`border-b border-card-border last:border-b-0 ${tx.rawId ? 'cursor-pointer hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-accent-blue focus-visible:outline-offset-2' : ''}`}
                >
                  <td className="px-6 py-4 text-text-primary font-mono">{tx.id}</td>
                  <td className="px-6 py-4 text-text-secondary">{tx.customer}</td>
                  <td className="px-6 py-4 text-text-secondary">{tx.date}</td>
                  <td className="px-6 py-4 text-text-primary font-medium">{tx.amount}</td>
                  <td className="px-6 py-4 text-text-secondary">{tx.asset}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
