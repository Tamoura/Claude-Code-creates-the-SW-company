import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

export default function CheckoutPreview() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  async function handleSimulatePayment() {
    setIsCreating(true);
    try {
      const session = await apiClient.createPaymentSession({
        amount: 10000, // $100.00 in cents
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        description: 'Simulated checkout — Pro Analytics Plan',
        merchant_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      });
      setLastPaymentId(session.id);
    } catch {
      // Payment creation may fail without real merchant address — show the ID if we got one
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">Live Checkout Preview</h3>

      <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
        {/* QR Code placeholder */}
        <div className="mx-auto mb-5 w-24 h-24 bg-white rounded-lg p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full text-gray-800">
            <rect x="5" y="5" width="25" height="25" rx="2" fill="currentColor" />
            <rect x="70" y="5" width="25" height="25" rx="2" fill="currentColor" />
            <rect x="5" y="70" width="25" height="25" rx="2" fill="currentColor" />
            <rect x="10" y="10" width="15" height="15" rx="1" fill="white" />
            <rect x="75" y="10" width="15" height="15" rx="1" fill="white" />
            <rect x="10" y="75" width="15" height="15" rx="1" fill="white" />
            <rect x="14" y="14" width="7" height="7" fill="currentColor" />
            <rect x="79" y="14" width="7" height="7" fill="currentColor" />
            <rect x="14" y="79" width="7" height="7" fill="currentColor" />
            <rect x="35" y="5" width="5" height="5" fill="currentColor" />
            <rect x="45" y="5" width="5" height="5" fill="currentColor" />
            <rect x="55" y="5" width="5" height="5" fill="currentColor" />
            <rect x="35" y="15" width="5" height="5" fill="currentColor" />
            <rect x="50" y="15" width="5" height="5" fill="currentColor" />
            <rect x="35" y="35" width="5" height="5" fill="currentColor" />
            <rect x="45" y="35" width="5" height="5" fill="currentColor" />
            <rect x="55" y="35" width="5" height="5" fill="currentColor" />
            <rect x="45" y="45" width="5" height="5" fill="currentColor" />
            <rect x="55" y="55" width="5" height="5" fill="currentColor" />
            <rect x="70" y="40" width="5" height="5" fill="currentColor" />
            <rect x="80" y="40" width="5" height="5" fill="currentColor" />
            <rect x="90" y="40" width="5" height="5" fill="currentColor" />
            <rect x="70" y="55" width="5" height="5" fill="currentColor" />
            <rect x="85" y="55" width="5" height="5" fill="currentColor" />
            <rect x="70" y="70" width="25" height="25" rx="2" fill="currentColor" />
            <rect x="75" y="75" width="15" height="15" rx="1" fill="white" />
            <rect x="79" y="79" width="7" height="7" fill="currentColor" />
          </svg>
        </div>

        <h4 className="text-lg font-semibold text-text-primary mb-1">Pro Analytics Plan</h4>
        <div className="text-2xl font-bold text-accent-pink mb-2">$100.00</div>
        <p className="text-sm text-text-secondary mb-6">
          Access real-time crypto analytics and webhook infrastructure.
        </p>

        {lastPaymentId ? (
          <div className="space-y-3">
            <div className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-accent-green border border-green-500/30">
              Payment Created
            </div>
            <p className="text-xs text-text-muted font-mono">{lastPaymentId}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/dashboard/payments')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary border border-card-border hover:text-text-primary transition-colors"
              >
                View in Payments
              </button>
              <button
                onClick={() => { setLastPaymentId(null); handleSimulatePayment(); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-all"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSimulatePayment}
            disabled={isCreating}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50"
          >
            {isCreating ? 'Creating Payment...' : 'Simulate Payment'}
          </button>
        )}
      </div>
    </div>
  );
}
