import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import type { PaymentSession } from '../lib/api-client';

type DisplayStatus = 'pending' | 'confirming' | 'completed' | 'failed';

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus.toUpperCase()) {
    case 'CONFIRMING': return 'confirming';
    case 'COMPLETED': return 'completed';
    case 'FAILED':
    case 'REFUNDED': return 'failed';
    default: return 'pending';
  }
}

export default function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const fetchPayment = async () => {
      try {
        const session = await apiClient.getCheckoutSession(id);
        if (!cancelled) {
          setPayment(session);
          // Redirect to appropriate checkout page if completed or failed
          const status = mapStatus(session.status);
          if (status === 'completed') {
            navigate(`/checkout/${id}/success`, { replace: true });
          } else if (status === 'failed') {
            navigate(`/checkout/${id}/failed`, { replace: true });
          }
        }
      } catch (err) {
        if (!cancelled) setError('Payment not found or has expired');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPayment();

    // Poll for updates every 3 seconds while payment is in progress
    const interval = setInterval(async () => {
      try {
        const session = await apiClient.getCheckoutSession(id);
        if (!cancelled) {
          setPayment(session);
          // Check for completion/failure on each poll
          const status = mapStatus(session.status);
          if (status === 'completed') {
            navigate(`/checkout/${id}/success`, { replace: true });
          } else if (status === 'failed') {
            navigate(`/checkout/${id}/failed`, { replace: true });
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading payment status...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="bg-card-bg rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Payment Not Found</h1>
          <p className="text-text-secondary mb-6">{error || 'This payment link is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const status = mapStatus(payment.status);

  const getStatusIcon = (s: DisplayStatus) => {
    switch (s) {
      case 'pending':
        return (
          <svg className="w-16 h-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'confirming':
        return (
          <svg className="w-16 h-16 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const statusText: Record<DisplayStatus, string> = {
    pending: 'Waiting for Payment',
    confirming: 'Confirming on Blockchain',
    completed: 'Payment Complete',
    failed: 'Payment Failed',
  };

  const statusDescription: Record<DisplayStatus, string> = {
    pending: 'Customer has not yet sent payment',
    confirming: 'Transaction is being confirmed on the blockchain...',
    completed: 'Payment successfully received!',
    failed: 'This payment could not be completed.',
  };

  const stepDone = (step: number) => {
    const order: DisplayStatus[] = ['pending', 'confirming', 'completed'];
    const current = order.indexOf(status);
    return current >= step;
  };

  return (
    <div className="min-h-screen bg-page-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Status Card */}
        <div className="bg-card-bg rounded-lg shadow-lg p-8 mb-6">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon(status)}
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {statusText[status]}
            </h1>
            <p className="text-text-secondary">
              {statusDescription[status]}
            </p>
          </div>

          {/* Progress Steps */}
          {status !== 'failed' && (
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stepDone(1) ? 'bg-green-500' : 'bg-yellow-500'
                  }`}>
                    <span className="text-white font-semibold">1</span>
                  </div>
                  <span className="text-xs mt-2 text-text-secondary">Initiated</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${stepDone(1) ? 'bg-green-500' : 'bg-card-border'}`}></div>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stepDone(2) ? 'bg-green-500' : status === 'confirming' ? 'bg-blue-500' : 'bg-card-border'
                  }`}>
                    <span className="text-white font-semibold">2</span>
                  </div>
                  <span className="text-xs mt-2 text-text-secondary">Confirming</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${stepDone(2) ? 'bg-green-500' : 'bg-card-border'}`}></div>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stepDone(2) ? 'bg-green-500' : 'bg-card-border'
                  }`}>
                    <span className="text-white font-semibold">3</span>
                  </div>
                  <span className="text-xs mt-2 text-text-secondary">Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="border-t border-card-border pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Amount</span>
              <span className="font-semibold text-text-primary">${payment.amount.toFixed(2)} {payment.token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Payment ID</span>
              <span className="text-sm font-mono text-text-primary">{payment.id.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between items-center text-sm text-text-muted">
              <span>Network</span>
              <span className="capitalize">{payment.network}</span>
            </div>
            {payment.tx_hash && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Transaction Hash</span>
                <span className="text-sm font-mono text-blue-600">
                  {payment.tx_hash.slice(0, 14)}...
                </span>
              </div>
            )}
            {payment.confirmations !== undefined && payment.confirmations > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Confirmations</span>
                <span className="text-sm text-text-primary">{payment.confirmations}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Created</span>
              <span className="text-sm text-text-primary">
                {new Date(payment.created_at).toLocaleString()}
              </span>
            </div>
            {payment.completed_at && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Completed</span>
                <span className="text-sm text-text-primary">
                  {new Date(payment.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {status === 'completed' && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
