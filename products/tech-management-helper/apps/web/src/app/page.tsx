import Link from 'next/link'

/**
 * Landing Page Component
 *
 * Hero section with product description and CTA to login
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold text-gray-900">
            Tech Management Helper
          </h1>
          <Link
            href="/login"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Log In
          </Link>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900 leading-tight">
            GRC Platform for
            <br />
            <span className="text-primary">Technology Managers</span>
          </h2>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage compliance across multiple frameworks, track risks with visual scoring,
            maintain control catalogs, and keep your asset inventory audit-ready.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg text-lg font-semibold hover:border-gray-400 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-32 max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Core Features
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Compliance Dashboard */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Compliance Dashboard
              </h4>
              <p className="text-gray-600">
                Track compliance status across NIST CSF, ISO 27001, COBIT, and IT4IT frameworks in one unified view.
              </p>
            </div>

            {/* Risk Management */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Risk Management
              </h4>
              <p className="text-gray-600">
                Visualize risks with scoring matrix, link to controls and assets, and track mitigation progress.
              </p>
            </div>

            {/* Asset Inventory */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Asset Inventory
              </h4>
              <p className="text-gray-600">
                Maintain accurate IT asset inventory with CSV import, risk linking, and criticality tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-32 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>&copy; 2026 Tech Management Helper. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}
