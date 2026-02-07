import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b border-[var(--border-card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">Pulse</span>
          </Link>
          <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Log in
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Documentation</h1>
        <p className="text-lg text-[var(--text-secondary)] mb-12">
          Learn how to set up and get the most out of Pulse.
        </p>

        <div className="space-y-8">
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Getting Started</h2>
            <p className="text-[var(--text-secondary)]">
              Connect your GitHub account, select repositories, and start monitoring
              your team&apos;s development velocity in under 2 minutes.
            </p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">API Reference</h2>
            <p className="text-[var(--text-secondary)]">
              REST API documentation for programmatic access to velocity metrics,
              risk scores, and activity data.
            </p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">WebSocket Protocol</h2>
            <p className="text-[var(--text-secondary)]">
              Real-time event streaming via WebSocket for live activity feeds
              and instant anomaly alerts.
            </p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Sprint Risk Scoring</h2>
            <p className="text-[var(--text-secondary)]">
              How the AI sprint risk algorithm works: 7 weighted factors,
              scoring methodology, and interpretation guide.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
