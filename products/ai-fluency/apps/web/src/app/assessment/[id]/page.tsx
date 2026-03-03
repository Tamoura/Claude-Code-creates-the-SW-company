import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Assessment Session',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssessmentSessionPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{t('assessment.in_progress')}</span>
            <span aria-label="Progress: 0 of 50 questions completed">
              0 / 50
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Assessment progress"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: '0%' }}
            />
          </div>
        </div>

        <Card padding="lg">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Conceptual Understanding &bull; Question 1 of 15
          </div>

          <h1 className="mb-6 text-xl font-semibold text-gray-900">
            What does the term &ldquo;hallucination&rdquo; mean in the context of large language models?
          </h1>

          <fieldset>
            <legend className="sr-only">Select your answer</legend>
            <div className="space-y-3">
              {[
                'The model creates vivid, imaginative responses',
                'The model generates plausible-sounding but factually incorrect information',
                'The model refuses to answer certain questions',
                'The model processes visual images incorrectly',
              ].map((option, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                >
                  <input
                    type="radio"
                    name={`question-${id}`}
                    value={i.toString()}
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 min-h-[48px]"
              disabled
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px]"
            >
              {t('common.next')}
            </button>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link
            href="/assessment"
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
          >
            Save and exit
          </Link>
        </div>
      </div>
    </div>
  );
}
