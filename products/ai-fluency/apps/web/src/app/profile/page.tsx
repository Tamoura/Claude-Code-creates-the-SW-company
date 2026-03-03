import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'My Fluency Profile',
};

const dimensions = [
  { key: 'conceptual', label: t('profile.dimensions.conceptual'), score: null },
  { key: 'practical', label: t('profile.dimensions.practical'), score: null },
  { key: 'critical', label: t('profile.dimensions.critical'), score: null },
  { key: 'collaborative', label: t('profile.dimensions.collaborative'), score: null },
];

export default function ProfilePage() {
  const hasAssessment = false; // Will be fetched from API after auth is wired

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('profile.title')}
          </h1>
          <p className="mb-8 text-gray-600">
            Your AI fluency across four dimensions.
          </p>

          {!hasAssessment ? (
            <div className="empty-state">
              <div className="text-5xl" aria-hidden="true">◎</div>
              <h2 className="empty-state-title">
                {t('profile.no_assessment')}
              </h2>
              <p className="empty-state-description">
                Complete your first assessment to see your fluency profile.
              </p>
              <Link
                href="/assessment"
                className="inline-flex min-h-[48px] items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
              >
                {t('profile.take_assessment')}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall score */}
              <Card padding="lg" className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {t('profile.overall_score')}
                </div>
                <div className="text-6xl font-bold text-brand-600 mb-1">—</div>
              </Card>

              {/* Dimensions */}
              <div className="grid gap-4 sm:grid-cols-2">
                {dimensions.map((dim) => (
                  <Card key={dim.key} padding="md">
                    <div className="mb-2 font-semibold text-gray-800">
                      {dim.label}
                    </div>
                    <div className="text-3xl font-bold text-brand-600">
                      {dim.score ?? '—'}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
