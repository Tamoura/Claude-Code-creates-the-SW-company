import { useState, FormEvent } from 'react';
import { apiClient } from '../../lib/api-client';

interface FormData {
  amount: string;
  description: string;
  network: 'polygon' | 'ethereum';
  token: 'USDC' | 'USDT';
  success_url: string;
  cancel_url: string;
}

interface ValidationErrors {
  amount?: string;
}

interface GeneratedSession {
  id: string;
  checkout_url: string;
  expires_at: string;
}

export default function CreatePaymentLink() {
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    description: '',
    network: 'polygon',
    token: 'USDC',
    success_url: '',
    cancel_url: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [generatedSession, setGeneratedSession] = useState<GeneratedSession | null>(null);
  const [copied, setCopied] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const trimmedAmount = formData.amount?.trim() || '';

    if (trimmedAmount === '') {
      newErrors.amount = 'Amount is required';
    } else {
      const amountValue = parseFloat(trimmedAmount);
      if (isNaN(amountValue) || amountValue <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.createPaymentSession({
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        network: formData.network,
        token: formData.token,
        merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        success_url: formData.success_url || undefined,
        cancel_url: formData.cancel_url || undefined,
      });

      setGeneratedSession({
        id: response.id,
        checkout_url: response.checkout_url,
        expires_at: response.expires_at,
      });
    } catch (error: unknown) {
      const err = error as { detail?: string; message?: string };
      setApiError(err.detail || err.message || 'Failed to create payment link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedSession) {
      await navigator.clipboard.writeText(generatedSession.checkout_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateAnother = () => {
    setFormData({
      amount: '',
      description: '',
      network: 'polygon',
      token: 'USDC',
      success_url: '',
      cancel_url: '',
    });
    setGeneratedSession(null);
    setErrors({});
    setApiError('');
    setCopied(false);
  };

  const formatExpiryDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If a session has been generated, show the result view
  if (generatedSession) {
    return (
      <div className="max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Payment Link Created</h2>
          <p className="text-text-secondary">Your payment link is ready to share with customers</p>
        </div>

        <div className="bg-card-bg border border-card-border rounded-xl p-6 space-y-6">
          {/* Checkout URL */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Checkout URL</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={generatedSession.checkout_url}
                readOnly
                className="flex-1 bg-page-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary font-mono text-sm"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Payment ID */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Payment ID</label>
            <div className="bg-page-bg border border-card-border rounded-lg px-4 py-2.5">
              <span className="text-text-primary font-mono text-sm">{generatedSession.id}</span>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Expires</label>
            <div className="bg-page-bg border border-card-border rounded-lg px-4 py-2.5">
              <span className="text-text-primary text-sm">{formatExpiryDate(generatedSession.expires_at)}</span>
            </div>
          </div>

          {/* Create Another Button */}
          <div className="pt-4">
            <button
              onClick={handleCreateAnother}
              className="w-full px-4 py-2.5 bg-accent-pink text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default form view
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Create Payment Link</h2>
        <p className="text-text-secondary">Generate a payment link to accept stablecoin payments</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-xl p-6 space-y-6">
        {/* API Error Display */}
        {apiError && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg px-4 py-3">
            <p className="text-red-500 text-sm">{apiError}</p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-text-primary mb-2">
            Amount (USD) *
          </label>
          <input
            type="number"
            id="amount"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full bg-page-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="100.00"
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
            Description (optional)
          </label>
          <input
            type="text"
            id="description"
            maxLength={200}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-page-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="Payment for services"
          />
          <p className="text-text-muted text-xs mt-1">{formData.description.length}/200 characters</p>
        </div>

        {/* Network */}
        <div>
          <label htmlFor="network-polygon" className="block text-sm font-medium text-text-primary mb-2">Network</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="network-polygon"
                name="network"
                value="polygon"
                checked={formData.network === 'polygon'}
                onChange={(e) => setFormData({ ...formData, network: e.target.value as 'polygon' })}
                className="text-accent-blue focus:ring-accent-blue"
              />
              <span className="text-text-primary">Polygon</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="network-ethereum"
                name="network"
                value="ethereum"
                checked={formData.network === 'ethereum'}
                onChange={(e) => setFormData({ ...formData, network: e.target.value as 'ethereum' })}
                className="text-accent-blue focus:ring-accent-blue"
              />
              <span className="text-text-primary">Ethereum</span>
            </label>
          </div>
        </div>

        {/* Token */}
        <div>
          <label htmlFor="token-usdc" className="block text-sm font-medium text-text-primary mb-2">Token</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="token-usdc"
                name="token"
                value="USDC"
                checked={formData.token === 'USDC'}
                onChange={(e) => setFormData({ ...formData, token: e.target.value as 'USDC' })}
                className="text-accent-blue focus:ring-accent-blue"
              />
              <span className="text-text-primary">USDC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="token-usdt"
                name="token"
                value="USDT"
                checked={formData.token === 'USDT'}
                onChange={(e) => setFormData({ ...formData, token: e.target.value as 'USDT' })}
                className="text-accent-blue focus:ring-accent-blue"
              />
              <span className="text-text-primary">USDT</span>
            </label>
          </div>
        </div>

        {/* Success URL */}
        <div>
          <label htmlFor="success_url" className="block text-sm font-medium text-text-primary mb-2">
            Success URL (optional)
          </label>
          <input
            type="url"
            id="success_url"
            value={formData.success_url}
            onChange={(e) => setFormData({ ...formData, success_url: e.target.value })}
            className="w-full bg-page-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="https://yoursite.com/success"
          />
          <p className="text-text-muted text-xs mt-1">Redirect URL after successful payment</p>
        </div>

        {/* Cancel URL */}
        <div>
          <label htmlFor="cancel_url" className="block text-sm font-medium text-text-primary mb-2">
            Cancel URL (optional)
          </label>
          <input
            type="url"
            id="cancel_url"
            value={formData.cancel_url}
            onChange={(e) => setFormData({ ...formData, cancel_url: e.target.value })}
            className="w-full bg-page-bg border border-card-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="https://yoursite.com/cancel"
          />
          <p className="text-text-muted text-xs mt-1">Redirect URL if payment is cancelled</p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Link'}
          </button>
        </div>
      </form>
    </div>
  );
}
