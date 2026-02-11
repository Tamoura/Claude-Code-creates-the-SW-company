import Link from 'next/link';

export default function ForTalentsPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          For GRC Professionals
        </h1>
        <p className="text-lg text-gray-600 mb-12 leading-relaxed">
          Whether you are just starting in GRC or are a seasoned CISO,
          ConnectGRC gives you the tools to assess, grow, and stand out
          in the field.
        </p>

        <div className="space-y-10">
          <section className="flex gap-4">
            <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-accent font-bold">1</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Know Where You Stand
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Take an AI-powered voice assessment that evaluates your
                knowledge across six GRC domains. Get a professional tier
                placement and detailed breakdown of your strengths and
                improvement areas.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-accent font-bold">2</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Plan Your Growth
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Use the Career Simulator to explore paths from your
                current role to your dream position. Get AI-driven
                recommendations on certifications, skills, and
                experience milestones.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-accent font-bold">3</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Get Connected
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your verified assessment tier makes you visible to
                employers looking for GRC talent. No more guessing if
                your resume conveys your true capabilities.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Start Your Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
