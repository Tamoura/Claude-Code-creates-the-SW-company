'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { generateInvoice } from '@/lib/api';
import { formatCents, formatTaxRate, formatDate } from '@/lib/format';
import type { Invoice } from '@/lib/types';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function NewInvoicePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  const handleGenerate = async () => {
    if (prompt.length < 10) return;

    setIsGenerating(true);
    setError(null);

    try {
      const invoice = await generateInvoice(prompt);
      setGeneratedInvoice(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setPrompt('');
    setGeneratedInvoice(null);
    setError(null);
  };

  const handleSaveDraft = () => {
    if (generatedInvoice) {
      router.push(`/dashboard/invoices/${generatedInvoice.id}`);
    }
  };

  const handleEdit = () => {
    if (generatedInvoice) {
      router.push(`/dashboard/invoices/${generatedInvoice.id}/edit`);
    }
  };

  // Input State
  if (!generatedInvoice) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">Describe your work</h1>
          </div>
          <p className="text-lg text-gray-600">
            Type what you did, who it&apos;s for, and how much to charge. Our AI will create a
            professional invoice.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., I did 40 hours of web development for Acme Corp at $125/hour. Apply 8.5% sales tax. Due in 2 weeks."
                  className="w-full min-h-[200px] p-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={`text-sm ${
                      prompt.length > 1900 ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {prompt.length}/2000
                  </span>
                  {prompt.length < 10 && prompt.length > 0 && (
                    <span className="text-sm text-gray-500">
                      At least 10 characters required
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={prompt.length < 10 || isGenerating}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating your invoice...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Tip: Be specific about hours, rates, client details, and tax requirements for best
            results.
          </p>
        </div>
      </div>
    );
  }

  // Preview State
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Preview</h1>
          <p className="text-gray-600 mt-1">Review your AI-generated invoice</p>
        </div>
        <Button onClick={handleStartOver} variant="outline">
          Start Over
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Invoice {generatedInvoice.invoiceNumber}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Created {formatDate(generatedInvoice.createdAt)}
              </p>
            </div>
            <Badge variant={generatedInvoice.status}>
              {generatedInvoice.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Client Info */}
          {generatedInvoice.client && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bill To</h3>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium text-gray-900">{generatedInvoice.client.name}</p>
                  {generatedInvoice.client.email && (
                    <p className="text-sm text-gray-600">{generatedInvoice.client.email}</p>
                  )}
                </div>
                {generatedInvoice.client.matched && (
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
              <p className="text-gray-900">{formatDate(generatedInvoice.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Due Date</p>
              <p className="text-gray-900">{formatDate(generatedInvoice.dueDate)}</p>
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
                  {generatedInvoice.items.map((item) => (
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
                <span className="text-gray-900 font-medium">
                  {formatCents(generatedInvoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  Tax ({formatTaxRate(generatedInvoice.taxRate)})
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCents(generatedInvoice.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCents(generatedInvoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {generatedInvoice.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{generatedInvoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button onClick={handleEdit} variant="outline">
          Edit Invoice
        </Button>
        <Button onClick={handleSaveDraft}>Save as Draft</Button>
      </div>
    </div>
  );
}
