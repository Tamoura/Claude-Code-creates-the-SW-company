/**
 * CheckoutFailed Page
 *
 * Shown when a payment has failed.
 * Features:
 * - Failed status with red X icon
 * - Payment details (amount, token, network)
 * - Try Again button linking back to payment page
 * - Contact merchant text
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import type { PaymentSession } from '../../lib/api-client';

export default function CheckoutFailed() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    apiClient
      .getCheckoutSession(id)
      .then(setPayment)
      .catch((err) => {
        console.error('Failed to load payment:', err);
        setError('Payment not found or has expired');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!payment || error) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="bg-card-bg rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Payment Not Found</h1>
          <p className="text-text-secondary mb-6">{error || 'This payment link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Failed Card */}
        <div className="bg-card-bg rounded-lg shadow-lg p-8 mb-6">
          {/* Failed Icon */}
          <div className="flex justify-center mb-6">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Failed Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Payment Failed
            </h1>
            <p className="text-text-secondary">
              We were unable to process your payment. Please try again or contact the merchant for assistance.
            </p>
          </div>

          {/* Payment Details */}
          <div className="border-t border-card-border pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Amount</span>
              <span className="font-semibold text-text-primary">
                ${payment.amount.toFixed(2)} {payment.token}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Network</span>
              <span className="capitalize text-text-primary">{payment.network}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Payment ID</span>
              <span className="text-sm font-mono text-text-primary">{payment.id}</span>
            </div>
          </div>

          {/* Try Again Button */}
          <div className="mt-8 space-y-3">
            <Link
              to={`/pay/${payment.id}`}
              className="block w-full bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Try Again
            </Link>
            <p className="text-center text-sm text-text-muted">
              Need help? Contact merchant for support
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-text-muted">
          <p>All transactions are secured by blockchain technology</p>
        </div>
      </div>
    </div>
  );
}
