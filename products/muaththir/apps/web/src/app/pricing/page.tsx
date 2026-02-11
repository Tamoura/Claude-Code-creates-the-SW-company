'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';

export default function PricingPage() {
  const t = useTranslations('pricing');

  const plans = [
    {
      name: t('freeName'),
      price: t('freePrice'),
      period: t('freePeriod'),
      description: t('freeDescription'),
      features: [
        t('freeFeature1'),
        t('freeFeature2'),
        t('freeFeature3'),
        t('freeFeature4'),
        t('freeFeature5'),
        t('freeFeature6'),
      ],
      cta: t('freeCta'),
      href: '/signup',
      featured: false,
    },
    {
      name: t('premiumName'),
      price: t('premiumPrice'),
      period: t('premiumPeriod'),
      annualPrice: t('premiumAnnual'),
      description: t('premiumDescription'),
      features: [
        t('premiumFeature1'),
        t('premiumFeature2'),
        t('premiumFeature3'),
        t('premiumFeature4'),
        t('premiumFeature5'),
        t('premiumFeature6'),
      ],
      cta: t('premiumCta'),
      href: '/signup',
      featured: true,
    },
  ];
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {t('title')}
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card ${
                  plan.featured
                    ? 'ring-2 ring-emerald-600 shadow-lg relative'
                    : ''
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('mostPopular')}
                  </span>
                )}
                <h2 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
                {plan.annualPrice && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    {plan.annualPrice}
                  </p>
                )}
                <ul className="mt-8 space-y-3" role="list">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-slate-700"
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
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block text-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
