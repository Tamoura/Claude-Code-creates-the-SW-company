'use client';

import Link from 'next/link';

const PLATFORMS = [
  { name: 'Reddit', icon: '📱' },
  { name: 'Hacker News', icon: '🔶' },
  { name: 'Twitter/X', icon: '🐦' },
  { name: 'LinkedIn', icon: '💼' },
  { name: 'TikTok', icon: '🎵' },
  { name: 'YouTube', icon: '📺' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-500">VCS</span>
            <span className="text-sm text-gray-400">Viral Content Scraper</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary text-sm">Log In</Link>
            <Link href="/login?mode=signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight">
          Find the <span className="text-brand-500">Top 1%</span> of Viral Content
          <br />Before Everyone Else
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-400">
          Real-time scraping across 9 platforms. AI-powered virality scoring.
          Know what&apos;s about to blow up — before it does.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard" className="btn-primary px-8 py-3 text-lg">
            Explore Dashboard
          </Link>
          <Link href="/content" className="btn-secondary px-8 py-3 text-lg">
            Browse Content
          </Link>
        </div>
      </section>

      {/* Platform Grid */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-200">
          Scraping Across Platforms
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="card flex flex-col items-center gap-2 text-center">
              <span className="text-3xl">{p.icon}</span>
              <span className="text-sm font-medium text-gray-300">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 bg-gray-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="card">
              <div className="mb-3 text-3xl">1</div>
              <h3 className="mb-2 text-lg font-bold text-brand-400">Scrape</h3>
              <p className="text-sm text-gray-400">
                Automated scrapers pull content from Reddit, HN, Twitter, LinkedIn,
                TikTok, YouTube, and more every 30 minutes.
              </p>
            </div>
            <div className="card">
              <div className="mb-3 text-3xl">2</div>
              <h3 className="mb-2 text-lg font-bold text-brand-400">Score</h3>
              <p className="text-sm text-gray-400">
                Our virality engine calculates engagement rate, growth velocity,
                share ratio, and platform-specific benchmarks.
              </p>
            </div>
            <div className="card">
              <div className="mb-3 text-3xl">3</div>
              <h3 className="mb-2 text-lg font-bold text-brand-400">Surface</h3>
              <p className="text-sm text-gray-400">
                Only the top 1% makes it to your feed. Filter by platform, category,
                or set alerts for specific topics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold">
          Stop Guessing. Start <span className="text-brand-500">Knowing</span>.
        </h2>
        <p className="mb-8 text-gray-400">
          Join creators and marketers who use data to find content ideas that actually go viral.
        </p>
        <Link href="/login?mode=signup" className="btn-primary px-10 py-3 text-lg">
          Start Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
        Built by ConnectSW. Powered by data.
      </footer>
    </div>
  );
}
