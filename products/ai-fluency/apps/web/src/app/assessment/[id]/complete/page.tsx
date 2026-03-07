'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { DimensionScore, DimensionKey } from '@/types/index';

/** Shape returned by GET /assessments/:id/results */
interface ApiResultsResponse {
  session: { id: string; status: string; startedAt: string; completedAt: string | null };
  profile: {
    id: string;
    overallScore: number;
    dimensionScores: Record<string, number>;
    selfReportScores: Record<string, number> | null;
    indicatorBreakdown: Record<string, unknown> | null;
    discernmentGap: number | null;
    algorithmVersion: number;
    createdAt: string;
  };
}

interface AssessmentResults {
  sessionId: string;
  overallScore: number;
  dimensions: DimensionScore[];
  discernmentGap?: number;
  completedAt: string;
}

function mapApiToResults(data: ApiResultsResponse): AssessmentResults {
  const dims: DimensionKey[] = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'];
  const dimensions: DimensionScore[] = dims.map((dim) => {
    const score = data.profile.dimensionScores?.[dim] ?? 0;
    let status: 'pass' | 'partial' | 'fail' = 'fail';
    if (score >= 70) status = 'pass';
    else if (score >= 40) status = 'partial';
    return { dimension: dim, score, status };
  });

  return {
    sessionId: data.session.id,
    overallScore: data.profile.overallScore,
    dimensions,
    discernmentGap: data.profile.discernmentGap ?? undefined,
    completedAt: data.session.completedAt ?? new Date().toISOString(),
  };
}

function statusColor(status: string): string {
  switch (status) {
    case 'pass':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'partial':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'fail':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pass':
      return 'Strong';
    case 'partial':
      return 'Developing';
    case 'fail':
      return 'Needs Growth';
    default:
      return status;
  }
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  let barColor = 'bg-red-500';
  if (clampedScore >= 70) barColor = 'bg-green-500';
  else if (clampedScore >= 40) barColor = 'bg-yellow-500';

  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score: ${Math.round(clampedScore)} out of 100`}
      >
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}

function DimensionRow({ dim }: { dim: DimensionScore }) {
  return (
    <div>
      <div className="mb-1 flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            {t(`profile.dimensions.${dim.dimension}`)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(dim.status)}`}
          >
            {statusLabel(dim.status)}
          </span>
        </div>
        <span className="text-brand-600 font-semibold">
          {Math.round(dim.score)}%
        </span>
      </div>
      <ScoreBar
        score={dim.score}
        label={t(`profile.dimensions.${dim.dimension}`)}
      />
    </div>
  );
}

export default function AssessmentCompletePage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadResults = async () => {
      try {
        const data = await api.get<ApiResultsResponse>(
          `/assessments/${sessionId}/results`,
        );
        if (mounted) setResults(mapApiToResults(data));
      } catch {
        if (mounted) {
          setError('Unable to load assessment results.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void loadResults();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl animate-pulse space-y-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto" />
          <div className="h-8 w-64 rounded bg-gray-200 mx-auto" />
          <div className="h-48 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="mb-4 text-gray-600">
            {error ?? 'Results not available.'}
          </p>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const overallScore = Math.round(results.overallScore);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-3xl"
            aria-hidden="true"
          >
            {'\u2713'}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('assessment.complete.title')}
          </h1>
          <p className="text-gray-600">
            {t('assessment.complete.description')}
          </p>
        </div>

        <Card padding="lg" className="mb-6">
          <div className="mb-6 text-center">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Overall AI Fluency Score
            </div>
            <div className="text-6xl font-bold text-brand-600">
              {overallScore}%
            </div>
            <div className="mt-2 max-w-xs mx-auto">
              <ScoreBar score={overallScore} label="Overall" />
            </div>
          </div>

          {/* Discernment gap warning */}
          {results.discernmentGap !== undefined &&
            results.discernmentGap > 15 && (
              <div
                role="alert"
                className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4"
              >
                <h2 className="text-sm font-semibold text-yellow-800 mb-1">
                  Discernment Gap Detected
                </h2>
                <p className="text-sm text-yellow-700">
                  Your self-reported confidence exceeds your demonstrated
                  discernment by {Math.round(results.discernmentGap)} points.
                  This gap suggests potential overconfidence in evaluating AI
                  outputs. Consider focusing on critical evaluation skills.
                </p>
              </div>
            )}

          <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Dimension Breakdown
          </h2>
          <div className="space-y-4">
            {results.dimensions.map((dim) => (
              <DimensionRow key={dim.dimension} dim={dim} />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/profile"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
          >
            {t('assessment.complete.view_profile')}
          </Link>
        </div>
      </div>
    </div>
  );
}
