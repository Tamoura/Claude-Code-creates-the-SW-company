import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individual developers exploring Pulse',
    features: [
      'Up to 3 repositories',
      '1 team',
      '7-day data retention',
      'Basic velocity metrics',
      'Activity feed',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$15',
    period: 'per user / month',
    description: 'For engineering managers who need deeper insights',
    features: [
      'Up to 20 repositories',
      '90-day data retention',
      'AI sprint risk scoring',
      'Mobile app + push notifications',
      'Anomaly detection alerts',
      'All velocity & quality metrics',
    ],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$25',
    period: 'per user / month',
    description: 'For growing engineering organizations',
    features: [
      'Unlimited repositories',
      '12-month data retention',
      'Cross-team overview (VP view)',
      'Slack integration',
      'Custom reporting',
      'Priority support',
      'Everything in Pro',
    ],
    cta: 'Start Team Trial',
    href: '/signup?plan=team',
    highlighted: false,
  },
];

export default function PricingPage() {
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Start free. Upgrade when your team grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-[var(--bg-card)] border rounded-xl p-8 ${
                plan.highlighted
                  ? 'border-indigo-600 ring-2 ring-indigo-600'
                  : 'border-[var(--border-card)]'
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
              <div className="mt-4 mb-2">
                <span className="text-4xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                <span className="text-[var(--text-muted)] ml-1">/ {plan.period}</span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm mb-6">{plan.description}</p>
              <Link
                href={plan.href}
                className={`block text-center py-2.5 rounded-lg font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-[var(--border-card)] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)]'
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
