import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-lg text-center">
        <div className="mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6">
            <svg
              className="h-10 w-10 text-white"
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
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to Mu&apos;aththir
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-md mx-auto">
            Track your child&apos;s holistic development across six dimensions:
            academic, social-emotional, behavioural, aspirational, Islamic, and physical.
          </p>
        </div>

        <div className="card text-left">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Get Started
          </h2>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Create your child&apos;s profile (name, date of birth)
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Review age-appropriate milestones
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Log your first observation
            </li>
          </ul>
          <Link
            href="/onboarding/child"
            className="btn-primary w-full text-center block"
          >
            Create Child Profile
          </Link>
        </div>

        {/* Demo Option */}
        <div className="mt-4 card text-left border-l-4 border-l-blue-400">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Explore with Demo Data</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                See what a fully-tracked child looks like. Log in as the demo account
                to explore insights, goals, and reports with pre-populated data.
              </p>
              <p className="text-xs text-slate-400">
                Demo login: <strong>demo@muaththir.app</strong> / <strong>DemoPassword123!</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
