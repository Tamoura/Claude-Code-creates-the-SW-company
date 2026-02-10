import Header from '../../components/layout/Header';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p>
              <strong>Last updated:</strong> February 2026
            </p>

            <p>
              By using Mu&apos;aththir, you agree to these terms. Please read
              them carefully.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Service Description
            </h2>
            <p>
              Mu&apos;aththir is a child development tracking platform that
              allows parents to record observations, track milestones, and
              monitor progress across six developmental dimensions.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Account Responsibility
            </h2>
            <p>
              You are responsible for maintaining the security of your account
              and all activity that occurs under your account. You must be at
              least 18 years old to create an account.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Data Ownership
            </h2>
            <p>
              You retain ownership of all content you create, including
              observations, child profiles, and milestone data. We do not claim
              any ownership over your data.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Acceptable Use
            </h2>
            <p>
              The platform is intended for tracking your own children&apos;s
              development. You agree not to use the service for any unlawful
              purpose or to violate the rights of others.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              Subscription
            </h2>
            <p>
              Free accounts include one child profile. Premium subscriptions
              provide unlimited child profiles and additional features.
              Subscriptions can be cancelled at any time.
            </p>

            <p className="text-sm text-slate-400 mt-12">
              Full terms of service will be published before launch.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
