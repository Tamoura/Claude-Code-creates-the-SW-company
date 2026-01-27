import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPayment } from '../lib/payments';
import { mockWallet } from '../lib/wallet';
import { simulateTransaction } from '../lib/transactions';
import type { Payment } from '../types/payment';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const p = getPayment(id);
      setPayment(p);
    }
  }, [id]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await mockWallet.connect();
      setWalletConnected(true);
    } catch (err) {
      setError('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePay = async () => {
    if (!payment || !id) return;

    setIsPaying(true);
    setError(null);

    try {
      // Send transaction
      await mockWallet.sendTransaction(payment.amount);

      // Simulate blockchain confirmation
      await simulateTransaction(id, payment.amount);

      // Redirect to status page
      navigate(`/status/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsPaying(false);
    }
  };

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">This payment link is invalid or has expired.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Payment
          </button>
        </div>
      </div>
    );
  }

  const fee = payment.amount * 0.005;
  const merchantReceives = payment.amount - fee;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Payment Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h1>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-600">Amount</span>
              <span className="text-2xl font-bold text-gray-900">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Fee (0.5%)</span>
              <span className="text-gray-700">-${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200">
              <span className="text-gray-600">Merchant receives</span>
              <span className="font-semibold text-green-600">${merchantReceives.toFixed(2)}</span>
            </div>
          </div>

          {/* Wallet Status */}
          {!walletConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Demo Mode</p>
                    <p className="text-xs text-blue-700 mt-1">This is a simulated wallet connection</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected Wallet */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Wallet Connected</p>
                    <p className="text-xs text-green-700 mt-1 font-mono">
                      {mockWallet.address.slice(0, 6)}...{mockWallet.address.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-700">Balance</p>
                    <p className="text-sm font-semibold text-green-900">${mockWallet.balance.toFixed(2)} USDC</p>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={isPaying}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPaying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </>
                ) : (
                  `Pay $${payment.amount.toFixed(2)}`
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>Secured by blockchain technology</p>
        </div>
      </div>
    </div>
  );
}
