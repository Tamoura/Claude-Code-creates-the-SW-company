'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicInvoice } from '@/lib/api';
import { formatCents, formatTaxRate, formatDate } from '@/lib/format';
import type { PublicInvoice } from '@/lib/types';
import { Loader2, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

export default function PublicInvoiceViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadInvoice = async () => {
    try {
      const data = await getPublicInvoice(token);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-900 mb-2">Invoice Not Found</h2>
        <p className="text-red-700">{error || 'This invoice link may be invalid or expired.'}</p>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="space-y-6">
      {/* Paid Banner */}
      {isPaid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-green-900">Payment Received</h2>
          <p className="text-green-700 mt-1">This invoice has been paid in full. Thank you!</p>
        </div>
      )}

      {/* Invoice Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
              <p className="text-lg text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <Badge variant={invoice.status}>{invoice.status.toUpperCase()}</Badge>
          </div>
        </div>

        {/* From/To Section */}
        <div className="px-8 py-6 grid md:grid-cols-2 gap-8">
          {/* From */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              From
            </h3>
            <p className="text-lg font-semibold text-gray-900">
              {invoice.fromBusinessName || invoice.fromName}
            </p>
            {invoice.fromBusinessName && (
              <p className="text-sm text-gray-600">{invoice.fromName}</p>
            )}
          </div>

          {/* To */}
          {invoice.client && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Bill To
              </h3>
              <p className="text-lg font-semibold text-gray-900">{invoice.client.name}</p>
              {invoice.client.email && (
                <p className="text-sm text-gray-600">{invoice.client.email}</p>
              )}
              {invoice.client.address && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                  {invoice.client.address}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="px-8 py-4 bg-gray-50 border-y border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Invoice Date
              </p>
              <p className="text-sm text-gray-900 mt-1">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Due Date
              </p>
              <p className="text-sm text-gray-900 mt-1">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-8 py-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wider pb-3">
                    Description
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-700 uppercase tracking-wider pb-3">
                    Qty
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-700 uppercase tracking-wider pb-3">
                    Rate
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-700 uppercase tracking-wider pb-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="py-4 text-sm text-gray-900 text-right">
                      {formatCents(item.unitPrice)}
                    </td>
                    <td className="py-4 text-sm text-gray-900 text-right font-medium">
                      {formatCents(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="max-w-xs ml-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900 font-medium">{formatCents(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tax ({formatTaxRate(invoice.taxRate)})</span>
              <span className="text-gray-900 font-medium">{formatCents(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-3">
              <span className="text-gray-900">Total</span>
              <span className="text-indigo-600">{formatCents(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 py-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Button */}
      {!isPaid && invoice.paymentLink && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Ready to Pay?</h3>
          <p className="text-indigo-700 mb-4">
            Pay securely online with credit card or bank transfer
          </p>
          <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              <CreditCard className="mr-2 h-5 w-5" />
              Pay {formatCents(invoice.total)} Now
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
