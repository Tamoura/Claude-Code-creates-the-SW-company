import Link from 'next/link';
import Header from '../components/layout/Header';
import { DIMENSIONS } from '../lib/dimensions';

function DimensionIcon({ icon, colour }: { icon: string; colour: string }) {
  const iconPaths: Record<string, string> = {
    Book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    Heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    Shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    Star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    Moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    Activity: 'M13 10V3L4 14h7v7l9-11h-7z',
  };

  return (
    <svg
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke={colour}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[icon] || iconPaths.Book} />
    </svg>
  );
}

const steps = [
  {
    number: '1',
    title: 'Observe',
    description:
      'Notice moments in your child\'s day -- a kind word, a solved puzzle, a prayer on time. Write a short observation and tag it to a dimension.',
  },
  {
    number: '2',
    title: 'Track',
    description:
      'Watch patterns emerge on the radar chart. See which dimensions are thriving and which need more attention. Check milestones for their age.',
  },
  {
    number: '3',
    title: 'Grow',
    description:
      'Use insights to guide your parenting intentionally. Celebrate strengths, address gaps early, and build a rich record of your child\'s journey.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Nurture every dimension
              <br />
              <span className="text-emerald-600">of your child</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Track your child&apos;s development across six interconnected
              dimensions. From academics to character, from health to
              aspirations -- see the complete picture.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="btn-primary text-base px-8 py-3.5"
              >
                Start Tracking Free
              </Link>
              <Link
                href="/about"
                className="btn-secondary text-base px-8 py-3.5"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Six Dimensions Grid */}
      <section className="py-20 sm:py-28 bg-white" aria-labelledby="dimensions-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              id="dimensions-heading"
              className="text-3xl sm:text-4xl font-bold text-slate-900"
            >
              Six Dimensions of Growth
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Every child is a complete human being. We track the dimensions
              that matter -- not just grades.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIMENSIONS.map((dimension) => (
              <div
                key={dimension.slug}
                className="rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow duration-300"
                style={{ borderLeftWidth: '4px', borderLeftColor: dimension.colour }}
              >
                <div
                  className="inline-flex p-2.5 rounded-xl mb-4"
                  style={{ backgroundColor: `${dimension.colour}15` }}
                >
                  <DimensionIcon
                    icon={dimension.icon}
                    colour={dimension.colour}
                  />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {dimension.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {dimension.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        className="py-20 sm:py-28 bg-slate-50"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              id="how-it-works-heading"
              className="text-3xl sm:text-4xl font-bold text-slate-900"
            >
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Three simple steps to intentional parenting.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-emerald-600">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Every child deserves to be seen -- completely.
          </h2>
          <p className="mt-6 text-lg text-emerald-100 max-w-2xl mx-auto">
            Start tracking your child&apos;s development for free. No credit
            card required.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-600 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">
                Mu&apos;aththir
              </span>
            </div>
            <nav className="flex gap-6" aria-label="Footer navigation">
              <Link href="/about" className="text-sm text-slate-400 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
