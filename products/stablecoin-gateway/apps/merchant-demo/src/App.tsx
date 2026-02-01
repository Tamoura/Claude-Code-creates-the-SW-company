import { useState } from 'react';

const DEFAULT_API_URL = 'http://localhost:5001';

interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  status: string;
  checkout_url: string;
  created_at: string;
}

type Step = 'config' | 'shop' | 'paying' | 'success';

export default function App() {
  const [step, setStep] = useState<Step>('config');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('0xdAC17F958D2ee523a2206206994597C13D831ec7');
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfigure = () => {
    if (!apiKey.trim() || !merchantAddress.trim()) {
      setError('API Key and Merchant Wallet Address are required');
      return;
    }
    setError(null);
    setStep('shop');
  };

  const handleBuy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/v1/payment-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          amount: 2500,
          currency: 'USD',
          description: 'Premium Widget',
          network: 'polygon',
          token: 'USDC',
          merchant_address: merchantAddress,
          success_url: window.location.origin + '?success=true',
          cancel_url: window.location.origin + '?cancelled=true',
          metadata: { product: 'premium-widget', demo: true },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || err.title || 'Failed to create payment');
      }

      const session: PaymentSession = await response.json();
      setPayment(session);
      setStep('paying');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!payment) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/v1/payment-sessions/${payment.id}`, {
        headers: { 'X-API-Key': apiKey },
      });
      const updated: PaymentSession = await response.json();
      setPayment(updated);
      if (updated.status === 'completed') {
        setStep('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPayment(null);
    setError(null);
    setStep('shop');
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Merchant Demo</h1>
        <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Simulate a merchant checkout using StableFlow payment API
        </p>
      </header>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['config', 'shop', 'paying', 'success'] as Step[]).map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= ['config', 'shop', 'paying', 'success'].indexOf(step) ? '#3b82f6' : '#e5e7eb',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0 }}>1. Configure API Access</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Enter your StableFlow API key and merchant wallet address.
            Get these from your <a href="http://localhost:3104/dashboard/api-keys" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>StableFlow Dashboard</a>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>API URL</label>
              <input
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk_live_..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>Merchant Wallet Address</label>
              <input
                type="text"
                value={merchantAddress}
                onChange={e => setMerchantAddress(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleConfigure}
              style={{ padding: '0.625rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Continue to Shop
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Product Page */}
      {step === 'shop' && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0 }}>2. Your Merchant Store</h2>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>Premium Widget</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                  A top-quality widget with all the features you need.
                </p>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>$25.00</span>
            </div>

            <button
              onClick={handleBuy}
              disabled={isLoading}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                background: isLoading ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: isLoading ? 'wait' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {isLoading ? 'Creating Payment...' : 'Pay with Crypto (USDC)'}
            </button>
          </div>

          <button
            onClick={() => setStep('config')}
            style={{ marginTop: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Back to config
          </button>
        </div>
      )}

      {/* Step 3: Payment in Progress */}
      {step === 'paying' && payment && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0 }}>3. Payment Created</h2>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div><strong>Session ID:</strong> {payment.id}</div>
            <div><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} {payment.currency}</div>
            <div><strong>Status:</strong> <span style={{ color: payment.status === 'completed' ? '#16a34a' : '#d97706' }}>{payment.status.toUpperCase()}</span></div>
            <div><strong>Checkout URL:</strong> <a href={payment.checkout_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', wordBreak: 'break-all' }}>{payment.checkout_url}</a></div>
            <div><strong>Created:</strong> {new Date(payment.created_at).toLocaleString()}</div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={handleCheckStatus}
              disabled={isLoading}
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              {isLoading ? 'Checking...' : 'Check Status'}
            </button>
            <button
              onClick={handleReset}
              style={{ padding: '0.5rem 1rem', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              New Payment
            </button>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.8rem', color: '#92400e' }}>
            <strong>Tip:</strong> In simulated mode, use the <code>simulate-payment.sh</code> script to advance this payment to COMPLETED, then click "Check Status" to see the update.
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && payment && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>&#10003;</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 0, color: '#16a34a' }}>Payment Complete!</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Payment <code>{payment.id}</code> has been confirmed on-chain.
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Amount: <strong>${(payment.amount / 100).toFixed(2)} USDC</strong>
          </p>
          <button
            onClick={handleReset}
            style={{ marginTop: '1rem', padding: '0.625rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Make Another Payment
          </button>
        </div>
      )}

      {/* How it works */}
      <div style={{ marginTop: '2rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0 }}>How This Works</h3>
        <ol style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>Enter your API key from the <a href="http://localhost:3104/dashboard/api-keys" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>StableFlow Dashboard</a></li>
          <li>Click "Pay with Crypto" to create a payment session via the API</li>
          <li>The customer would be redirected to the checkout URL to complete payment</li>
          <li>StableFlow monitors the blockchain for payment confirmation</li>
          <li>Once confirmed, the merchant receives a webhook notification</li>
          <li>Use <code>scripts/simulate-payment.sh</code> to advance payments in dev mode</li>
        </ol>
      </div>
    </div>
  );
}
