import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient, type PaymentSession } from '../../lib/api-client';
import { formatCurrency, formatDate, truncateAddress, getBlockExplorerUrl } from '../../lib/formatters';
import { usePaymentEvents } from '../../hooks/usePaymentEvents';
import SseStatusBadge from '../../components/dashboard/SseStatusBadge';

// Status badge component matching TransactionsTable pattern
function StatusBadge({ status }: { status: PaymentSession['status'] }) {
  const statusUpper = status.toUpperCase();
  const styles = {
    COMPLETED: 'bg-green-500/15 text-accent-green border-green-500/30',
    CONFIRMING: 'bg-yellow-500/15 text-accent-yellow border-yellow-500/30',
    PENDING: 'bg-yellow-500/15 text-accent-yellow border-yellow-500/30',
    FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
    REFUNDED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  }[statusUpper] || 'bg-gray-500/15 text-text-muted border-gray-500/30';

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {statusUpper}
    </span>
  );
}

// Copy button component
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-xs font-medium text-text-secondary border border-card-border rounded hover:text-text-primary hover:border-text-muted transition-colors"
      aria-label={`Copy ${label}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SSE real-time updates (only for pending/confirming payments)
  const shouldConnectSSE = payment && (payment.status === 'pending' || payment.status === 'confirming');
  const {
    status: sseStatus,
    confirmations: sseConfirmations,
    txHash: sseTxHash,
    connectionState,
  } = usePaymentEvents(shouldConnectSSE ? id : undefined);

  const loadPayment = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getPaymentSession(id);
      setPayment(data);
    } catch (err: unknown) {
      if (err instanceof Error && 'status' in err && (err as any).status === 404) {
        setError('Payment not found');
      } else {
        setError('Failed to load payment details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  // Merge SSE data with payment data for display
  const displayStatus = sseStatus || payment?.status || 'unknown';
  const displayConfirmations = sseConfirmations > 0 ? sseConfirmations : (payment?.confirmations || 0);
  const displayTxHash = sseTxHash || payment?.tx_hash || null;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/dashboard/payments"
          className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back to Payments
        </Link>
        <div className="text-center py-12 text-text-secondary">
          Loading payment details...
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payment) {
    return (
      <div className="space-y-6">
        <Link
          to="/dashboard/payments"
          className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back to Payments
        </Link>
        <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Payment not found</h2>
          <p className="text-text-secondary mb-6">
            The payment you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/dashboard/payments"
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/payments"
          className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Back to Payments
        </Link>
        <div className="flex items-center gap-3">
          {shouldConnectSSE && <SseStatusBadge state={connectionState} />}
          <button
            onClick={loadPayment}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-card-border rounded-lg hover:text-text-primary hover:border-text-muted transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Header section */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-mono mb-2">{payment.id}</h1>
            <StatusBadge status={displayStatus as PaymentSession['status']} />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-text-primary">
              {formatCurrency(payment.amount, payment.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Detail cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Info card */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Payment Information</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-text-muted mb-1">Description</div>
              <div className="text-text-primary">{payment.description || 'No description'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-text-muted mb-1">Network</div>
                <div className="text-text-primary capitalize">{payment.network}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted mb-1">Token</div>
                <div className="text-text-primary">{payment.token}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Created</div>
              <div className="text-text-primary">{formatDate(payment.created_at)}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Expires</div>
              <div className="text-text-primary">{formatDate(payment.expires_at)}</div>
            </div>
            {payment.completed_at && (
              <div>
                <div className="text-xs text-text-muted mb-1">Completed</div>
                <div className="text-text-primary">{formatDate(payment.completed_at)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Info card */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Blockchain Information</h2>
          <div className="space-y-3">
            {displayTxHash ? (
              <>
                <div>
                  <div className="text-xs text-text-muted mb-1">Transaction Hash</div>
                  <div className="flex items-center justify-between">
                    <a
                      href={getBlockExplorerUrl(payment.network, displayTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-blue hover:underline font-mono text-sm"
                    >
                      {truncateAddress(displayTxHash)}
                    </a>
                    <CopyButton text={displayTxHash} label="transaction hash" />
                  </div>
                </div>
                {payment.block_number && (
                  <div>
                    <div className="text-xs text-text-muted mb-1">Block Number</div>
                    <div className="text-text-primary font-mono">{payment.block_number}</div>
                  </div>
                )}
                {displayConfirmations !== undefined && (
                  <div>
                    <div className="text-xs text-text-muted mb-1">Confirmations</div>
                    <div className="text-text-primary font-mono">{displayConfirmations}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-text-secondary">No blockchain data yet</div>
            )}
            {payment.customer_address && (
              <div>
                <div className="text-xs text-text-muted mb-1">Customer Address</div>
                <div className="flex items-center justify-between">
                  <span className="text-text-primary font-mono text-sm">
                    {truncateAddress(payment.customer_address)}
                  </span>
                  <CopyButton text={payment.customer_address} label="customer address" />
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-text-muted mb-1">Merchant Address</div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-mono text-sm">
                  {truncateAddress(payment.merchant_address)}
                </span>
                <CopyButton text={payment.merchant_address} label="merchant address" />
              </div>
            </div>
          </div>
        </div>

        {/* Links card */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-text-primary mb-4">Payment Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-text-muted mb-1">Checkout URL</div>
              <div className="flex items-center justify-between">
                <a
                  href={payment.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline text-sm truncate"
                >
                  {payment.checkout_url}
                </a>
                <CopyButton text={payment.checkout_url} label="checkout URL" />
              </div>
            </div>
            {payment.success_url && (
              <div>
                <div className="text-xs text-text-muted mb-1">Success URL</div>
                <div className="flex items-center justify-between">
                  <a
                    href={payment.success_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:underline text-sm truncate"
                  >
                    {payment.success_url}
                  </a>
                  <CopyButton text={payment.success_url} label="success URL" />
                </div>
              </div>
            )}
            {payment.cancel_url && (
              <div>
                <div className="text-xs text-text-muted mb-1">Cancel URL</div>
                <div className="flex items-center justify-between">
                  <a
                    href={payment.cancel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:underline text-sm truncate"
                  >
                    {payment.cancel_url}
                  </a>
                  <CopyButton text={payment.cancel_url} label="cancel URL" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
