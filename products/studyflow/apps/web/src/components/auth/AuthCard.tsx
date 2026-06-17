import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto w-full max-w-6xl px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white"
          >
            S
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            StudyFlow
          </span>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="card w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
