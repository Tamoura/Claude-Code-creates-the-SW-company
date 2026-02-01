'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { getInvoice, deleteInvoice, sendInvoice, updateInvoice } from '@/lib/api';
import { formatCents, formatTaxRate, formatDate } from '@/lib/format';
import type { Invoice } from '@/lib/types';
import {
  Loader2,
  ArrowLeft,
  Edit,
  Send,
  Trash2,
  Download,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(id);
      setInvoice(data);
      setShareableLink(data.shareToken ? `${window.location.origin}/invoice/${data.shareToken}` : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    setActionLoading('delete');
    try {
      await deleteInvoice(id);
      router.push('/dashboard/invoices');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    setActionLoading('send');
    try {
      const result = await sendInvoice(id);
      setShareableLink(result.shareableLink);
      await loadInvoice(); // Refresh to get updated status
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return;

    setActionLoading('markpaid');
    try {
      await updateInvoice(id, { status: 'paid' });
      await loadInvoice(); // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark invoice as paid');
    } finally {
      setActionLoading(null);
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error || 'Invoice not found'}</p>
          <Link href="/dashboard/invoices" className="mt-4 inline-block">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      {/* Shareable Link */}
      {shareableLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Invoice sent!</p>
              <p className="text-sm text-green-700 mt-1">Shareable link:</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-white px-3 py-1 rounded border border-green-200 flex-1">
                  {shareableLink}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    alert('Link copied to clipboard!');
                  }}
                >
                  Copy
                </Button>
                <a href={shareableLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Card */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Created {formatDate(invoice.createdAt)}</p>
            </div>
            <Badge variant={invoice.status}>{invoice.status.toUpperCase()}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Client Info */}
          {invoice.client && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bill To</h3>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium text-gray-900">{invoice.client.name}</p>
                  {invoice.client.email && (
                    <p className="text-sm text-gray-600">{invoice.client.email}</p>
                  )}
                </div>
                {invoice.client.matched && (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Matched</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Invoice Date</p>
              <p className="text-gray-900">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Due Date</p>
              <p className="text-gray-900">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-sm font-semibold text-gray-700 pb-2">
                      Description
                    </th>
                    <th className="text-right text-sm font-semibold text-gray-700 pb-2">Qty</th>
                    <th className="text-right text-sm font-semibold text-gray-700 pb-2">Rate</th>
                    <th className="text-right text-sm font-semibold text-gray-700 pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-900 text-right">
                        {formatCents(item.unitPrice)}
                      </td>
                      <td className="py-3 text-sm text-gray-900 text-right font-medium">
                        {formatCents(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal</span>
                <span className="text-gray-900 font-medium">{formatCents(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tax ({formatTaxRate(invoice.taxRate)})</span>
                <span className="text-gray-900 font-medium">{formatCents(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCents(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {invoice.paidAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">
                Paid on {formatDate(invoice.paidAt)}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <>
              <Link href={`/dashboard/invoices/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                onClick={handleSend}
                disabled={actionLoading === 'send'}
              >
                {actionLoading === 'send' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Invoice
              </Button>
            </>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              onClick={handleMarkPaid}
              disabled={actionLoading === 'markpaid'}
            >
              {actionLoading === 'markpaid' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark as Paid
            </Button>
          )}
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={actionLoading === 'delete'}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {actionLoading === 'delete' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete
        </Button>
      </div>
    </div>
  );
}
