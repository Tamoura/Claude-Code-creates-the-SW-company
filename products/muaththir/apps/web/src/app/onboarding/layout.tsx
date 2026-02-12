'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="Mu'aththir home"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="text-base font-bold text-slate-900">
                Mu&apos;aththir
              </span>
            </Link>

            {/* Back to Dashboard link */}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('backToDashboard')}
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  );
}
