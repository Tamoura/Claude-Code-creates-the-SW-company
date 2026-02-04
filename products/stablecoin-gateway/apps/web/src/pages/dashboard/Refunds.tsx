import { useState } from 'react';
import { useRefunds } from '../../hooks/useRefunds';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  PROCESSING: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-green-500/15 text-accent-green border-green-500/30',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_OPTIONS = ['All', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

export default function Refunds() {
  const { refunds, isLoading, error, totalCount, statusFilter, setStatusFilter } = useRefunds();
  const [activeFilter, setActiveFilter] = useState('All');

  const handleFilterChange = (status: string) => {
    setActiveFilter(status);
    setStatusFilter(status === 'All' ? undefined : status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Refunds</h2>
          <p className="text-text-secondary">
            {totalCount} total refund{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(status => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              activeFilter === status
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'text-text-secondary border-card-border hover:text-text-primary'
            }`}
          >
            {status === 'All' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Refunds List */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading refunds...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : refunds.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {statusFilter ? `No ${statusFilter.toLowerCase()} refunds` : 'No refunds yet'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map(refund => (
                <tr key={refund.id} className="border-b border-card-border last:border-b-0 hover:bg-page-bg/50">
                  <td className="px-4 py-3 text-sm text-text-primary font-mono">
                    {refund.id.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                    {refund.payment_session_id.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                    ${refund.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[refund.status] || ''}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {refund.reason || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(refund.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
