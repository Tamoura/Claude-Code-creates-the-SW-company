'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleStripeCallback } from '@/lib/api';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import Link from 'next/link';

function StripeCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setStatus('error');
      setErrorMessage('Stripe connection was cancelled or failed. Please try again.');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Missing authorization code. Please try connecting again.');
      return;
    }

    connectStripe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, error]);

  const connectStripe = async () => {
    if (!code) return;

    try {
      await handleStripeCallback(code);
      setStatus('success');
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/settings');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to connect Stripe account. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Stripe...</h2>
            <p className="text-gray-600">Please wait while we connect your Stripe account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              Stripe Connected Successfully!
            </h2>
            <p className="text-green-700 mb-6">
              You can now accept payments from your clients.
            </p>
            <p className="text-sm text-gray-600">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Connection Failed</h2>
            <p className="text-red-700 mb-6">{errorMessage}</p>
            <Link href="/dashboard/settings">
              <Button>Return to Settings</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function StripeCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
      </div>
    }>
      <StripeCallbackContent />
    </Suspense>
  );
}
