import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// Note: ProtectedRoute logic will be enforced via middleware in a future sprint.
// For now, page renders — auth is enforced client-side via useAuth hook.

const statCards = [
  {
    label: 'Overall Fluency Score',
    value: '—',
    description: 'Take an assessment to see your score',
    href: '/assessment',
    cta: 'Take Assessment',
  },
  {
    label: 'Learning Paths Active',
    value: '0',
    description: 'No active learning paths',
    href: '/learning',
    cta: 'Browse Paths',
  },
  {
    label: 'Assessments Completed',
    value: '0',
    description: 'Start your AI fluency journey',
    href: '/assessment',
    cta: 'Start Now',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('dashboard.title')}
          </h1>
          <p className="mb-8 text-gray-600">
            Track your AI fluency progress and learning journey.
          </p>

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {statCards.map((stat) => (
              <Card key={stat.label} padding="md">
                <div className="mb-1 text-sm font-medium text-gray-500">
                  {stat.label}
                </div>
                <div className="mb-2 text-3xl font-bold text-brand-600">
                  {stat.value}
                </div>
                <p className="mb-3 text-sm text-gray-500">{stat.description}</p>
                <Link
                  href={stat.href}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                >
                  {stat.cta} &rarr;
                </Link>
              </Card>
            ))}
          </div>

          {/* Getting started */}
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Getting Started
            </h2>
            <ol className="space-y-4" role="list">
              <li className="flex items-start gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
                  aria-hidden="true"
                >
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    Take your first assessment
                  </p>
                  <p className="text-sm text-gray-500">
                    Understand your current AI fluency across 4 dimensions.
                  </p>
                  <Link
                    href="/assessment"
                    className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Start Assessment &rarr;
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400"
                  aria-hidden="true"
                >
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-500">
                    View your fluency profile
                  </p>
                  <p className="text-sm text-gray-400">
                    Complete an assessment to unlock your profile.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400"
                  aria-hidden="true"
                >
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-500">
                    Follow personalized learning paths
                  </p>
                  <p className="text-sm text-gray-400">
                    AI-curated content based on your assessment results.
                  </p>
                </div>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
