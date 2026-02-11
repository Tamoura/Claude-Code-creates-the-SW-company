import Link from 'next/link';

const features = [
  {
    title: 'AI-Powered Assessments',
    description:
      'Voice-based assessments evaluate your GRC knowledge across six domains with AI-driven scoring and personalized feedback.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    title: 'Career Simulator',
    description:
      'Explore career paths, get certification ROI analysis, and receive personalized guidance from an AI career counselor.',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Professional Tiering',
    description:
      'Get placed into a professional tier based on your assessment results. Track your growth over time with detailed analytics.',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
  {
    title: 'Resource Hub',
    description:
      'Access curated GRC content, framework guides, certification prep materials, and industry insights.',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary-800 to-primary-900 text-white">
        <div className="container-page py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Advance Your GRC Career with AI-Powered Insights
            </h1>
            <p className="text-lg sm:text-xl text-primary-200 mb-8 leading-relaxed">
              ConnectGRC is the first AI-native talent platform built
              specifically for Governance, Risk, and Compliance
              professionals. Assess your skills, simulate career paths,
              and connect with top employers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-accent text-white px-8 py-3 rounded-lg font-semibold hover:bg-accent-600 transition-colors text-center"
              >
                Get Started Free
              </Link>
              <Link
                href="/how-it-works"
                className="border border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Grow in GRC
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From assessment to career planning, ConnectGRC provides the
              tools GRC professionals need to stand out and advance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={feature.icon}
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="container-page text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Take Your GRC Career Further?
          </h2>
          <p className="text-secondary-100 mb-8 max-w-xl mx-auto">
            Join thousands of GRC professionals who are using
            ConnectGRC to assess their skills and plan their careers.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-secondary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>
    </>
  );
}
