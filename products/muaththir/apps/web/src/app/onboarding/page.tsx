import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center px-4">
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
            Let&apos;s set up your first child profile so you can start
            tracking their development across all six dimensions.
          </p>
        </div>

        <div className="card text-left">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            What&apos;s Next
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
            className="btn-primary w-full text-center"
          >
            Create Child Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
