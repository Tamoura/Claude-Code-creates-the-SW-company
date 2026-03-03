import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Assessment Complete',
};

interface Props {
  params: { id: string };
}

const dimensionResults = [
  { name: 'Conceptual', score: 74 },
  { name: 'Practical', score: 68 },
  { name: 'Critical Thinking', score: 81 },
  { name: 'Collaborative', score: 72 },
];

export default function AssessmentCompletePage({ params }: Props) {
  const overallScore = Math.round(
    dimensionResults.reduce((sum, d) => sum + d.score, 0) /
      dimensionResults.length,
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-3xl"
            aria-hidden="true"
          >
            ✓
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('assessment.complete.title')}
          </h1>
          <p className="text-gray-600">
            {t('assessment.complete.description')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Session ID: {params.id}
          </p>
        </div>

        <Card padding="lg" className="mb-6">
          <div className="mb-6 text-center">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Overall Score
            </div>
            <div className="text-6xl font-bold text-brand-600">
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">out of 100</div>
          </div>

          <div className="space-y-4">
            {dimensionResults.map((dim) => (
              <div key={dim.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{dim.name}</span>
                  <span className="text-brand-600 font-semibold">
                    {dim.score}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-valuenow={dim.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dim.name} score: ${dim.score} out of 100`}
                >
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-700"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/profile"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
          >
            {t('assessment.complete.view_profile')}
          </Link>
          <Link
            href="/learning"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
          >
            View Learning Paths
          </Link>
        </div>
      </div>
    </div>
  );
}
