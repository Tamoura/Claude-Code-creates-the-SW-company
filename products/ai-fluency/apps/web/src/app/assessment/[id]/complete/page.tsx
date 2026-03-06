'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n';
import type {
  DetailedFluencyProfile,
  AIFeedback,
  Dimension,
} from '@/types/index';

interface ResultsData {
  profile: DetailedFluencyProfile;
  feedback: AIFeedback;
}

interface Props {
  params: Promise<{ id: string }>;
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  DELEGATION: 'Delegation',
  DESCRIPTION: 'Description',
  DISCERNMENT: 'Discernment',
  DILIGENCE: 'Diligence',
};

const DIMENSIONS: Dimension[] = [
  'DELEGATION',
  'DESCRIPTION',
  'DISCERNMENT',
  'DILIGENCE',
];

export default function AssessmentCompletePage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchResults = async () => {
      try {
        const result = await api.get<ResultsData>(
          `/assessment-sessions/${id}/results`,
        );
        if (mounted) setData(result);
      } catch {
        if (mounted) setError('Failed to load assessment results.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchResults();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-64px)] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <Card padding="lg" className="max-w-md text-center">
          <p className="mb-4 text-gray-700" role="alert">
            {error ?? 'Results not found.'}
          </p>
          <Link
            href="/assessment"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Return to assessments
          </Link>
        </Card>
      </div>
    );
  }

  const { profile, feedback } = data;
  const overallScore = Math.round(profile.overallScore);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-3xl"
            aria-hidden="true"
          >
            &#10003;
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('assessment.complete.title')}
          </h1>
          <p className="text-gray-600">
            {t('assessment.complete.description')}
          </p>
          <p className="mt-1 text-xs text-gray-400">Session ID: {id}</p>
        </div>

        {/* Overall score */}
        <Card padding="lg" className="mb-6">
          <div className="mb-6 text-center">
            <div className="mb-1 text-sm font-medium text-gray-500">
              Overall Score
            </div>
            <div className="text-6xl font-bold text-brand-600">
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">out of 100</div>
          </div>

          {/* Dimension scores */}
          <div className="space-y-4">
            {DIMENSIONS.map((dim) => {
              const score = Math.round(
                profile.dimensionScores[dim] ?? 0,
              );
              return (
                <div key={dim}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {DIMENSION_LABELS[dim]}
                    </span>
                    <span className="font-semibold text-brand-600">
                      {score}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${DIMENSION_LABELS[dim]} score: ${score} out of 100`}
                  >
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Discernment gap warning */}
        {profile.discernmentGap && feedback.discernmentGapWarning && (
          <Card padding="md" className="mb-6 border-warning-300 bg-warning-50">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 text-lg text-warning-600"
                aria-hidden="true"
              >
                &#9888;
              </span>
              <div>
                <h2 className="mb-1 font-semibold text-warning-800">
                  Discernment Gap Detected
                </h2>
                <p className="text-sm text-warning-700">
                  {feedback.discernmentGapWarning}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* AI Feedback */}
        <Card padding="lg" className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            AI Feedback
          </h2>
          <p className="mb-4 text-sm text-gray-600">{feedback.summary}</p>

          {feedback.topStrengths.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">
                Strengths
              </h3>
              <ul className="space-y-1" role="list">
                {feedback.topStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1 text-success-500" aria-hidden="true">
                      &#10003;
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.priorityImprovements.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">
                Areas for Improvement
              </h3>
              <ul className="space-y-1" role="list">
                {feedback.priorityImprovements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span
                      className="mt-1 text-brand-500"
                      aria-hidden="true"
                    >
                      &#8594;
                    </span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Actions */}
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
