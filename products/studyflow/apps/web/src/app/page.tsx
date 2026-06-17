import Link from 'next/link';

// Read at build/render time so the page proves the API URL wiring is in place.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5017';

const FEATURES = [
  {
    title: 'Discover subjects',
    body: 'Browse a curated catalog of university subjects — search by name or code, compare credits and workload, and add your own.',
  },
  {
    title: 'Set goals',
    body: 'Turn each chosen subject into measurable study goals with targets, due dates, and daily or weekly cadence.',
  },
  {
    title: 'Track progress',
    body: 'Log progress as you go and watch completion, streaks, and at-risk reminders keep you on course all term.',
  },
];

function ChevronRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4l6 6-6 6" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* --- Top nav -------------------------------------------------------- */}
      <header className="border-b border-[#eceeed] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sage-600 text-lg font-bold text-white"
            >
              S
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              StudyFlow
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* --- Hero ----------------------------------------------------------- */}
      <section className="dot-grid-bg">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <p className="pill mb-6">For university students</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Choose your subjects.{' '}
            <span className="text-sage-600">Track every step.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            StudyFlow turns a messy semester into a clear plan: discover and pick
            your subjects, set measurable study goals for each one, and track your
            progress with streaks and reminders that keep you moving.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary w-full sm:w-auto">
              Start for free
              <ChevronRight />
            </Link>
            <Link href="/login" className="btn-secondary w-full sm:w-auto">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* --- Feature cards -------------------------------------------------- */}
      <section
        aria-label="How StudyFlow works"
        className="mx-auto max-w-6xl px-6 pb-24"
      >
        <ol className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className="card text-left transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50 text-base font-bold text-sage-700 ring-1 ring-inset ring-sage-100"
                >
                  {i + 1}
                </span>
                <span className="btn-icon-circle" aria-hidden>
                  <ChevronRight />
                </span>
              </div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* --- Footer -------------------------------------------------------- */}
      <footer className="border-t border-[#eceeed] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-slate-500 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} StudyFlow</span>
          <span className="text-xs text-slate-400">API: {API_URL}</span>
        </div>
      </footer>
    </main>
  );
}
