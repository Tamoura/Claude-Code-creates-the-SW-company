import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fafbfb] px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn-primary">
          Go to dashboard
        </Link>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </main>
  );
}
