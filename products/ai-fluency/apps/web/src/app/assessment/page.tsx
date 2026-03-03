import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Assessment',
};

const dimensions = [
  {
    name: 'DELEGATION',
    description:
      'Tests your ability to delegate tasks appropriately to AI, including reasoning about when and how to use AI assistance.',
    questionCount: 15,
  },
  {
    name: 'DESCRIPTION',
    description:
      'Evaluates how well you describe tasks and context to AI tools to get accurate, useful outputs.',
    questionCount: 15,
  },
  {
    name: 'DISCERNMENT',
    description:
      'Assesses your ability to evaluate AI outputs, identify missing context, and spot errors or hallucinations.',
    questionCount: 12,
  },
  {
    name: 'DILIGENCE',
    description:
      'Measures how effectively you verify AI work, maintain accountability, and apply ethical oversight.',
    questionCount: 8,
  },
];

export default function AssessmentPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('assessment.title')}
          </h1>
          <p className="mb-8 text-gray-600">{t('assessment.description')}</p>

          <Card padding="md" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              What to expect
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {dimensions.map((dim) => (
                <div
                  key={dim.name}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <h3 className="mb-1 font-semibold text-gray-800 text-sm">
                    {dim.name}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    {dim.description}
                  </p>
                  <span className="text-xs font-medium text-brand-600">
                    {dim.questionCount} questions
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600">50</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="h-8 w-px bg-gray-200" aria-hidden="true" />
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600">20–30</div>
                <div className="text-xs text-gray-500">Minutes</div>
              </div>
              <div className="h-8 w-px bg-gray-200" aria-hidden="true" />
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600">4</div>
                <div className="text-xs text-gray-500">Dimensions</div>
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Link
              href="/assessment/new"
              className="inline-flex min-h-[48px] items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              {t('assessment.start')}
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-[48px] items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              View Past Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
