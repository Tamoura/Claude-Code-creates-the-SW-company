import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPayment } from '../lib/payments';
import type { Payment, PaymentStatus } from '../types/payment';

export default function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!id) return;

    // Initial load
    setPayment(getPayment(id));

    // Poll for updates every 500ms
    const interval = setInterval(() => {
      const updated = getPayment(id);
      setPayment(updated);
    }, 500);

    return () => clearInterval(interval);
  }, [id]);

  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">This payment link is invalid.</p>
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

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
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
      case 'complete':
        return (
          <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusText = (status: PaymentStatus): string => {
    switch (status) {
      case 'pending': return 'Waiting for Payment';
      case 'confirming': return 'Confirming on Blockchain';
      case 'complete': return 'Payment Complete';
    }
  };

  const getStatusDescription = (status: PaymentStatus): string => {
    switch (status) {
      case 'pending': return 'Customer has not yet sent payment';
      case 'confirming': return 'Transaction is being confirmed on the blockchain...';
      case 'complete': return 'Payment successfully received!';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon(payment.status)}
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getStatusText(payment.status)}
            </h1>
            <p className="text-gray-600">
              {getStatusDescription(payment.status)}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {/* Step 1: Pending */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.status !== 'pending' ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  <span className="text-white font-semibold">1</span>
                </div>
                <span className="text-xs mt-2 text-gray-600">Initiated</span>
              </div>

              {/* Connector */}
              <div className={`flex-1 h-1 mx-2 ${
                payment.status !== 'pending' ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>

              {/* Step 2: Confirming */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.status === 'complete' ? 'bg-green-500' :
                  payment.status === 'confirming' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <span className="text-white font-semibold">2</span>
                </div>
                <span className="text-xs mt-2 text-gray-600">Confirming</span>
              </div>

              {/* Connector */}
              <div className={`flex-1 h-1 mx-2 ${
                payment.status === 'complete' ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>

              {/* Step 3: Complete */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.status === 'complete' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <span className="text-white font-semibold">3</span>
                </div>
                <span className="text-xs mt-2 text-gray-600">Complete</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold text-gray-900">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment ID</span>
              <span className="text-sm font-mono text-gray-700">{payment.id.slice(0, 8)}...</span>
            </div>
            {payment.txHash && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transaction Hash</span>
                <span className="text-sm font-mono text-blue-600 cursor-pointer hover:underline">
                  {payment.txHash.slice(0, 10)}...
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Created</span>
              <span className="text-sm text-gray-700">
                {new Date(payment.createdAt).toLocaleString()}
              </span>
            </div>
            {payment.completedAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed</span>
                <span className="text-sm text-gray-700">
                  {new Date(payment.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {payment.status === 'complete' && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create New Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
