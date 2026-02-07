'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    // TODO: extract token from URL params and verify via API
    const timer = setTimeout(() => {
      setStatus('success');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">Pulse</span>
        </Link>

        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-8">
          {status === 'verifying' && (
            <>
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Verifying your email...</h1>
              <p className="text-[var(--text-secondary)]">Please wait while we verify your email address.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Email verified!</h1>
              <p className="text-[var(--text-secondary)] mb-6">Your email has been successfully verified.</p>
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-block"
              >
                Go to login
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Verification failed</h1>
              <p className="text-[var(--text-secondary)] mb-6">The verification link is invalid or has expired.</p>
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
