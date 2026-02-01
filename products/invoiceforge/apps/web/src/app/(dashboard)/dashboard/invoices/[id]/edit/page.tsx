'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { getInvoice, updateInvoice } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Loader2, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

interface LineItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function InvoiceEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { description: '', quantity: '1', unitPrice: '0.00' },
  ]);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(id);

      // Populate form with invoice data
      setClientName(data.client?.name || '');
      setInvoiceDate(data.invoiceDate.split('T')[0]); // Convert to YYYY-MM-DD
      setDueDate(data.dueDate.split('T')[0]);
      setLineItems(
        data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: (item.unitPrice / 100).toFixed(2),
        }))
      );
      setTaxRate((data.taxRate / 100).toFixed(2));
      setNotes(data.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = (): number => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price * 100; // in cents
    }, 0);
  };

  const calculateTax = (): number => {
    const subtotal = calculateSubtotal();
    const taxRateBps = parseFloat(taxRate) * 100; // to basis points
    return Math.round((subtotal * taxRateBps) / 10000);
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax();
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unitPrice: '0.00' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return; // Keep at least one item
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemForm, value: string) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const handleSave = async () => {
    // Validation
    if (!clientName.trim()) {
      alert('Client name is required');
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      alert('All line items must have a description');
      return;
    }

    setSaving(true);
    try {
      await updateInvoice(id, {
        // Note: We can't change clientId here (just name), API may not support this
        items: lineItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: Math.round((parseFloat(item.unitPrice) || 0) * 100),
          amount:
            Math.round((parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0) * 100),
        })),
        taxRate: Math.round((parseFloat(taxRate) || 0) * 100),
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        notes: notes.trim() || undefined,
      });
      router.push(`/dashboard/invoices/${id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error}</p>
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
        <div>
          <Link href={`/dashboard/invoices/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Invoice</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client */}
          <Input
            label="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Acme Corp"
            required
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="w-32 flex items-center h-10">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCents(
                        Math.round(
                          (parseFloat(item.quantity) || 0) *
                            (parseFloat(item.unitPrice) || 0) *
                            100
                        )
                      )}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    disabled={lineItems.length === 1}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Rate */}
          <div className="max-w-xs">
            <Input
              label="Tax Rate (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          {/* Totals Preview */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal</span>
                <span className="text-gray-900 font-medium">
                  {formatCents(calculateSubtotal())}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tax ({taxRate}%)</span>
                <span className="text-gray-900 font-medium">{formatCents(calculateTax())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCents(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Additional notes or payment terms..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/invoices/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
