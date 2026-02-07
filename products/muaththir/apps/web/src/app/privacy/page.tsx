import Header from '../../components/layout/Header';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p>
              <strong>Last updated:</strong> February 2026
            </p>

            <p>
              Mu&apos;aththir takes your family&apos;s privacy seriously. This
              policy outlines how we collect, use, and protect your data and
              your children&apos;s data.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Our Commitments
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All child data is encrypted at rest</li>
              <li>No analytics tracking pixels on pages that display child data</li>
              <li>No third-party data sharing under any circumstances</li>
              <li>
                GDPR compliant: data export within 24 hours, full deletion within
                30 days
              </li>
              <li>
                COPPA compliant: all child data is treated as sensitive regardless
                of jurisdiction
              </li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Data We Collect
            </h2>
            <p>
              We collect only the data necessary to provide the service: your
              name, email, and the observations and milestones you choose to
              record about your children. We do not collect data about your
              browsing habits, location, or contacts.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Data Retention
            </h2>
            <p>
              Your data remains as long as your account is active. Deleted
              observations are soft-deleted and recoverable for 30 days, then
              permanently removed. Account deletion removes all data within 30
              days.
            </p>

            <p className="text-sm text-slate-400 mt-12">
              Full privacy policy details will be published before launch.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
