"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service (e.g., Sentry) when integrated
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-4 text-2xl font-bold text-neutral-900">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-neutral-600">
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        Try again
      </button>
    </div>
  );
}
