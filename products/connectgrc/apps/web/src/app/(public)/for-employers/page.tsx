import Link from 'next/link';

export default function ForEmployersPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          For Employers
        </h1>
        <p className="text-lg text-gray-600 mb-12 leading-relaxed">
          Find GRC talent that has been independently assessed and
          verified. No more guessing about candidate capabilities.
        </p>

        <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mb-10">
          <h2 className="text-lg font-semibold text-accent-800 mb-2">
            Coming Soon
          </h2>
          <p className="text-accent-700">
            Employer features are currently in development and will be
            available in Phase 2. Sign up below to be notified when
            employer access launches.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              What to Expect
            </h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Search candidates by professional tier, GRC domains,
                  certifications, and experience level.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  View verified assessment summaries that go beyond
                  self-reported skills on a resume.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Post GRC-specific job listings that reach the right
                  audience.
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/contact"
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Contact Us for Early Access
          </Link>
        </div>
      </div>
    </div>
  );
}
