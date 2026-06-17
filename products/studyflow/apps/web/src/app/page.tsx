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

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white"
          >
            S
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            StudyFlow
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <p className="mb-4 inline-block rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700">
          For university students
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Choose your subjects. Set real goals.{' '}
          <span className="text-brand-600">Track every step.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          StudyFlow turns a messy semester into a clear plan: discover and pick
          your subjects, set measurable study goals for each one, and track your
          progress with streaks and reminders that keep you moving.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup" className="btn-primary w-full sm:w-auto">
            Get started — it&apos;s free
          </Link>
          <Link href="/login" className="btn-secondary w-full sm:w-auto">
            I already have an account
          </Link>
        </div>
      </section>

      <section
        aria-label="How StudyFlow works"
        className="mx-auto max-w-6xl px-6 pb-24"
      >
        <ol className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="card text-left">
              <span
                aria-hidden
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-base font-bold text-brand-700"
              >
                {i + 1}
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                {f.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-100 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-slate-500 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} StudyFlow</span>
          <span className="text-xs text-slate-400">API: {API_URL}</span>
        </div>
      </footer>
    </main>
  );
}
