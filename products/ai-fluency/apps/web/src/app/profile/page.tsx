'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
import { DimensionRadarChart } from '@/components/charts/DimensionRadarChart';
import type {
  DetailedFluencyProfile,
  FluencyProfile,
  Dimension,
} from '@/types/index';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'DELEGATION', label: t('profile.dimensionScores.DELEGATION') },
  { key: 'DESCRIPTION', label: t('profile.dimensionScores.DESCRIPTION') },
  { key: 'DISCERNMENT', label: t('profile.dimensionScores.DISCERNMENT') },
  { key: 'DILIGENCE', label: t('profile.dimensionScores.DILIGENCE') },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<FluencyProfile | null>(null);
  const [history, setHistory] = useState<DetailedFluencyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          api
            .get<{ profile: FluencyProfile }>('/profiles/me')
            .catch(() => null),
          api
            .get<{ profiles: DetailedFluencyProfile[] }>('/profiles/history')
            .catch(() => null),
        ]);
        if (!mounted) return;
        if (profileRes) setProfile(profileRes.profile);
        if (historyRes) setHistory(historyRes.profiles);
      } catch {
        // Show empty state
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const hasAssessment = profile !== null;

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

          {isLoading ? (
            <div
              className="flex justify-center py-12"
              role="status"
              aria-live="polite"
            >
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
                aria-hidden="true"
              />
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          ) : !hasAssessment ? (
            <div className="empty-state">
              <div className="text-5xl" aria-hidden="true">
                &#9678;
              </div>
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
                <div className="mb-1 text-sm font-medium text-gray-500">
                  {t('profile.overall_score')}
                </div>
                <div className="mb-1 text-6xl font-bold text-brand-600">
                  {Math.round(profile.overallScore)}
                </div>
                <div className="text-sm text-gray-500">out of 100</div>
              </Card>

              {/* Radar chart */}
              <Card padding="lg">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Dimension Overview
                </h2>
                <DimensionRadarChart dimensions={profile.dimensionScores} />
              </Card>

              {/* Dimension breakdown cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {DIMENSIONS.map((dim) => {
                  const score = Math.round(
                    profile.dimensionScores[dim.key] ?? 0,
                  );
                  return (
                    <Card key={dim.key} padding="md">
                      <div className="mb-2 font-semibold text-gray-800">
                        {dim.label}
                      </div>
                      <div className="mb-2 text-3xl font-bold text-brand-600">
                        {score}
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                        role="progressbar"
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${dim.label} score: ${score} out of 100`}
                      >
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-700"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Assessment history */}
              {history.length > 0 && (
                <Card padding="lg">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    Assessment History
                  </h2>
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            Score: {Math.round(entry.overallScore)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Link
                          href={`/assessment/${entry.sessionId}/complete`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                        >
                          View details
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
