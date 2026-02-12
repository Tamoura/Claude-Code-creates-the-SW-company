'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring (production would send to a service)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex items-center justify-center min-h-[50vh] px-4"
    >
      <div className="card max-w-md w-full text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-7 w-7 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            An unexpected error occurred. Please try again or return to the
            dashboard.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
          <a href="/dashboard" className="btn-secondary inline-flex items-center justify-center">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
