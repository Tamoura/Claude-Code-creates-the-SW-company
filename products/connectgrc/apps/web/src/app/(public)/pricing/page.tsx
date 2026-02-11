import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic GRC assessment and career tools.',
    features: [
      'One assessment per quarter',
      'Basic results and tier placement',
      'Career path explorer',
      'Public resource hub access',
    ],
    cta: 'Get Started',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'Full access to assessments, career tools, and premium resources.',
    features: [
      'Unlimited assessments',
      'Detailed domain breakdown',
      'AI career counselor',
      'Full resource hub access',
      'Certification ROI analysis',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations managing GRC talent at scale.',
    features: [
      'Everything in Professional',
      'Team assessments and analytics',
      'Custom question pools',
      'SSO integration',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the plan that fits your career goals. Start free and
          upgrade as you grow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-lg p-6 ${
              tier.highlight
                ? 'bg-primary text-white shadow-xl ring-2 ring-primary scale-105'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-2 ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>
              {tier.name}
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className={`text-sm ${tier.highlight ? 'text-primary-200' : 'text-gray-500'}`}>
                {tier.period}
              </span>
            </div>
            <p className={`text-sm mb-6 ${tier.highlight ? 'text-primary-200' : 'text-gray-600'}`}>
              {tier.description}
            </p>
            <ul className="space-y-3 mb-8">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <svg
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? 'text-accent-200' : 'text-secondary'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              className={`block text-center py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                tier.highlight
                  ? 'bg-white text-primary hover:bg-gray-100'
                  : 'bg-primary text-white hover:bg-primary-700'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
