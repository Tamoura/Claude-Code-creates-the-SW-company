import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { createPayment } from '../lib/payments';

interface PaymentFormData {
  amount: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PaymentFormData>();

  const onSubmit = (data: PaymentFormData) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount < 1 || amount > 10000) {
      return;
    }

    const payment = createPayment(amount);
    const link = `${window.location.origin}/pay/${payment.id}`;
    setGeneratedLink(link);
    reset();
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Stablecoin Gateway
            </h1>
            <p className="text-xl text-gray-600">
              Accept USDC/USDT payments with 0.5% fees. Get paid in 5 minutes.
            </p>
          </div>

          {/* Payment Link Generator */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Create Payment Link
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max="10000"
                    {...register('amount', {
                      required: 'Amount is required',
                      min: { value: 1, message: 'Minimum $1' },
                      max: { value: 10000, message: 'Maximum $10,000' },
                    })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Generate Payment Link
              </button>
            </form>
          </div>

          {/* Generated Link Display */}
          {generatedLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                Payment Link Created!
              </h3>
              <div className="bg-white rounded-lg p-3 mb-4 break-all">
                <code className="text-sm text-gray-800">{generatedLink}</code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => navigate(generatedLink.replace(window.location.origin, ''))}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  View Payment Page
                </button>
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Low Fees</h3>
              <p className="text-sm text-gray-600">Only 0.5% per transaction</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Fast Settlement</h3>
              <p className="text-sm text-gray-600">Get paid in 5 minutes</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Stablecoin Only</h3>
              <p className="text-sm text-gray-600">No crypto volatility</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
