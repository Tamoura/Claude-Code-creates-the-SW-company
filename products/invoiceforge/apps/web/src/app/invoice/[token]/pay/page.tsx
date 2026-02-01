'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicInvoice } from '@/lib/api';
import { formatCents } from '@/lib/format';
import type { PublicInvoice } from '@/lib/types';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';

function PaymentSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const sessionId = searchParams.get('session_id');

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadInvoice = async () => {
    try {
      const data = await getPublicInvoice(token);
      setInvoice(data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Success Header */}
        <div className="bg-green-50 border-b border-green-200 px-8 py-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-900 mb-2">Payment Successful!</h1>
          <p className="text-lg text-green-700">
            Thank you for your payment. Your transaction has been completed.
          </p>
        </div>

        {/* Payment Details */}
        <div className="px-8 py-8">
          {invoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Invoice Number</p>
                  <p className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Amount Paid</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCents(invoice.total)}
                  </p>
                </div>
              </div>

              {sessionId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Transaction ID</p>
                  <p className="text-sm text-gray-700 font-mono">{sessionId}</p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  A payment confirmation has been sent to your email address. You can view your
                  invoice details at any time using the link below.
                </p>
                <Link href={`/invoice/${token}/view`}>
                  <Button variant="outline" className="w-full">
                    View Invoice
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!invoice && (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Your payment was successful. Please check your email for confirmation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* What's Next */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You will receive a payment confirmation email shortly</li>
          <li>• The invoice sender has been notified of your payment</li>
          <li>• Keep this page bookmarked to access your invoice later</li>
        </ul>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
