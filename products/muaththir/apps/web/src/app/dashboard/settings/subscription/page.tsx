import Link from 'next/link';

export default function SubscriptionSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Subscription
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your plan and billing.
        </p>
      </div>

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Current Plan
          </h2>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
            Free
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          1 child profile, unlimited observations and milestones.
        </p>
        <Link
          href="/pricing"
          className="btn-primary text-sm py-2 px-4"
        >
          Upgrade to Premium
        </Link>
      </div>

      {/* Premium Benefits */}
      <div className="card border-l-4 border-l-emerald-500">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Premium ($8/month)
        </h2>
        <ul className="space-y-2">
          {[
            'Unlimited child profiles',
            'Data export (CSV/PDF)',
            'Weekly email digest',
            'Priority support',
            'Early access to new features',
          ].map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <svg
                className="h-4 w-4 text-emerald-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
