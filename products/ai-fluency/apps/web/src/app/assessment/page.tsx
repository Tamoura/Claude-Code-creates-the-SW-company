'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
import type { AssessmentSession, Question } from '@/types/index';

const dimensions = [
  {
    name: 'DELEGATION',
    description:
      'Tests your ability to delegate tasks appropriately to AI, including reasoning about when and how to use AI assistance.',
    questionCount: 8,
  },
  {
    name: 'DESCRIPTION',
    description:
      'Evaluates how well you describe tasks and context to AI tools to get accurate, useful outputs.',
    questionCount: 8,
  },
  {
    name: 'DISCERNMENT',
    description:
      'Assesses your ability to evaluate AI outputs, identify missing context, and spot errors or hallucinations.',
    questionCount: 8,
  },
  {
    name: 'DILIGENCE',
    description:
      'Measures how effectively you verify AI work, maintain accountability, and apply ethical oversight.',
    questionCount: 8,
  },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const result = await api.post<{
        session: AssessmentSession;
        questions: Question[];
      }>('/assessment-sessions');
      router.push(`/assessment/${result.session.id}`);
    } catch {
      setError('Failed to create assessment session. Please try again.');
      setIsStarting(false);
    }
  };

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
                  <h3 className="mb-1 text-sm font-semibold text-gray-800">
                    {dim.name}
                  </h3>
                  <p className="mb-2 text-xs text-gray-600">
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
                <div className="text-2xl font-bold text-brand-600">32</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="h-8 w-px bg-gray-200" aria-hidden="true" />
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600">
                  20&ndash;25
                </div>
                <div className="text-xs text-gray-500">Minutes</div>
              </div>
              <div className="h-8 w-px bg-gray-200" aria-hidden="true" />
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600">4</div>
                <div className="text-xs text-gray-500">Dimensions</div>
              </div>
            </div>
          </Card>

          {error && (
            <p className="mb-4 text-sm text-danger-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              loading={isStarting}
              aria-label="Start a new assessment"
            >
              {t('assessment.start')}
            </Button>
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
