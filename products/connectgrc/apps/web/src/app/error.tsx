'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="text-left mb-6">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {error.message}
              </pre>
            </details>
          )}
          <button
            onClick={reset}
            className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
