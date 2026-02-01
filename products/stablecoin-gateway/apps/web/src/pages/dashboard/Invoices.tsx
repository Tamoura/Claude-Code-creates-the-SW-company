import { useState, useEffect } from 'react';
import { apiClient, type PaymentSession } from '../../lib/api-client';

interface Invoice {
  id: string;
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  customer: string;
  date: string;
}

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await apiClient.listPaymentSessions({ status: 'completed' });
        const mapped: Invoice[] = result.data.map((p: PaymentSession) => ({
          id: `INV-${p.id.replace('ps_', '').toUpperCase()}`,
          paymentId: p.id,
          amount: formatCurrency(p.amount),
          currency: p.currency,
          status: p.status === 'completed' ? 'Paid' : 'Pending',
          customer: p.customer_address || 'Unknown',
          date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }));
        setInvoices(mapped);
      } catch {
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Invoices</h2>
        <p className="text-text-secondary">
          Completed payment invoices generated from your transactions
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Invoice</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Customer</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Date</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Amount</th>
              <th className="text-left px-6 py-3.5 text-text-muted font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                  No completed payments yet. Invoices are generated from completed transactions.
                </td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="border-b border-card-border last:border-b-0">
                  <td className="px-6 py-4 font-mono text-text-primary">{inv.id}</td>
                  <td className="px-6 py-4 text-text-secondary font-mono text-xs truncate max-w-[200px]">{inv.customer}</td>
                  <td className="px-6 py-4 text-text-secondary">{inv.date}</td>
                  <td className="px-6 py-4 text-text-primary font-medium">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-accent-green border border-green-500/30">
                      {inv.status}
                    </span>
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
