"use client";

import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Verifying your email
      </h1>
      <p className="text-muted-foreground mb-6">
        Please wait while we verify your email address. This may
        take a moment.
      </p>

      <div className="space-y-3">
        <Link
          href="/login"
          className="block w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 text-center min-h-[48px] leading-[32px]"
        >
          Go to sign in
        </Link>
        <Link
          href="/"
          className="block text-sm text-muted-foreground hover:text-foreground text-center"
        >
          Return to home page
        </Link>
      </div>
    </div>
  );
}
