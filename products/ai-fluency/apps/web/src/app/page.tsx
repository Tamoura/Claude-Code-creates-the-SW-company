import Link from 'next/link';
import type { Metadata } from 'next';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'AI Fluency — Measure and Grow Your AI Skills',
  description: t('home.hero.subtitle'),
};

const features = [
  {
    key: 'assess',
    title: t('home.features.assess.title'),
    description: t('home.features.assess.description'),
    icon: '◎',
  },
  {
    key: 'paths',
    title: t('home.features.paths.title'),
    description: t('home.features.paths.description'),
    icon: '◈',
  },
  {
    key: 'org',
    title: t('home.features.org.title'),
    description: t('home.features.org.description'),
    icon: '◉',
  },
];

const dimensions = [
  { name: 'Conceptual', score: 78, description: 'Understanding AI fundamentals and concepts' },
  { name: 'Practical', score: 65, description: 'Applying AI tools in real workflows' },
  { name: 'Critical', score: 82, description: 'Evaluating AI outputs and risks' },
  { name: 'Collaborative', score: 70, description: 'Working with AI as a team' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero section */}
      <section
        aria-labelledby="hero-heading"
        className="bg-gradient-to-b from-brand-50 to-white px-4 py-16 text-center sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            Now available for enterprise teams
          </div>
          <h1
            id="hero-heading"
            className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            {t('home.hero.title')}
          </h1>
          <p className="mb-8 text-lg text-gray-600 sm:text-xl max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors min-h-[48px] flex items-center"
            >
              {t('home.hero.cta.primary')}
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors min-h-[48px] flex items-center"
            >
              {t('home.hero.cta.secondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* 4D Score Preview */}
      <section
        aria-labelledby="score-heading"
        className="bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            id="score-heading"
            className="mb-4 text-center text-2xl font-bold text-gray-900"
          >
            Your 4-Dimension Fluency Profile
          </h2>
          <p className="mb-8 text-center text-gray-600">
            See exactly where your team excels and where to grow.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {dimensions.map((dim) => (
              <div
                key={dim.name}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
              >
                <div className="mb-1 text-3xl font-bold text-brand-600">
                  {dim.score}
                </div>
                <div className="mb-1 text-sm font-semibold text-gray-800">
                  {dim.name}
                </div>
                <div className="text-xs text-gray-500">{dim.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <h2
            id="features-heading"
            className="mb-12 text-center text-2xl font-bold text-gray-900 sm:text-3xl"
          >
            {t('home.features.title')}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 text-4xl" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section
        aria-labelledby="cta-heading"
        className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl">
          <h2
            id="cta-heading"
            className="mb-4 text-2xl font-bold text-white sm:text-3xl"
          >
            Ready to measure your team&apos;s AI fluency?
          </h2>
          <p className="mb-8 text-brand-200">
            Join thousands of organizations building AI-ready teams.
          </p>
          <Link
            href="/register"
            className="inline-flex min-h-[48px] items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-700 transition-colors"
          >
            {t('home.hero.cta.primary')}
          </Link>
        </div>
      </section>
    </div>
  );
}
