/**
 * CheckoutSuccess Page
 *
 * Shown when a payment has been completed successfully.
 * Features:
 * - Success confirmation with green checkmark
 * - Payment details (amount, token, network)
 * - Transaction hash with block explorer link
 * - Merchant redirect button (if success_url provided)
 * - Receipt section
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import type { PaymentSession } from '../../lib/api-client';

// Helper to get block explorer URL based on network
function getBlockExplorerUrl(network: string, txHash: string): string {
  const explorers: Record<string, string> = {
    polygon: 'https://polygonscan.com/tx/',
    ethereum: 'https://etherscan.io/tx/',
  };
  return `${explorers[network] || explorers.ethereum}${txHash}`;
}

export default function CheckoutSuccess() {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!payment || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This payment link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <svg
              className="w-16 h-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Your payment has been processed and confirmed on the blockchain.
            </p>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold text-gray-900">
                ${payment.amount.toFixed(2)} {payment.token}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Network</span>
              <span className="capitalize text-gray-900">{payment.network}</span>
            </div>
            {payment.tx_hash && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transaction</span>
                <a
                  href={getBlockExplorerUrl(payment.network, payment.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-mono"
                >
                  {payment.tx_hash.slice(0, 10)}...{payment.tx_hash.slice(-8)}
                </a>
              </div>
            )}
          </div>

          {/* Receipt Section */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Receipt Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Payment ID</span>
                <span className="font-mono text-gray-700">{payment.id}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Date</span>
                <span className="text-gray-700">
                  {new Date(payment.completed_at || payment.created_at).toLocaleString()}
                </span>
              </div>
              {payment.confirmations !== undefined && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Confirmations</span>
                  <span className="text-gray-700">{payment.confirmations}</span>
                </div>
              )}
            </div>
          </div>

          {/* Merchant Return Button */}
          {payment.success_url && (
            <div className="mt-8">
              <button
                onClick={() => {
                  window.location.href = payment.success_url!;
                }}
                className="w-full bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Return to merchant
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>This transaction is secured by blockchain technology</p>
        </div>
      </div>
    </div>
  );
}
