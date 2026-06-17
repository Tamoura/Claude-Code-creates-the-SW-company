import Link from 'next/link';

// Minimal placeholder — the Frontend agent builds the real auth form (US-01).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="card w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">Log in to StudyFlow</h1>
        <p className="mt-3 text-sm text-slate-600">
          The sign-in form is coming next. This route is wired and ready for the
          Frontend agent to build out.
        </p>
        <Link href="/" className="btn-secondary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </main>
  );
}
