'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { DimensionKey } from '@/types/index';

interface ProfileData {
  profile: {
    id: string;
    overallScore: number;
    dimensionScores: Record<string, number>;
    selfReportScores: Record<string, number> | null;
    discernmentGap: number | null;
    createdAt: string;
  } | null;
}

const dimensionKeys: DimensionKey[] = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'];

function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  let color = 'bg-red-500';
  if (clamped >= 70) color = 'bg-green-500';
  else if (clamped >= 40) color = 'bg-yellow-500';

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const data = await api.get<ProfileData>('/profile');
        if (mounted) setProfileData(data);
      } catch {
        // No profile or not authenticated
        if (mounted) setProfileData(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      void fetchProfile();
    } else if (!authLoading) {
      setIsLoading(false);
    }

    return () => { mounted = false; };
  }, [authLoading, user]);

  const profile = profileData?.profile;
  const hasProfile = profile !== null && profile !== undefined;

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar />
        <div className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-3xl animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
            <div className="h-48 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

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

          {!hasProfile ? (
            <div className="empty-state">
              <div className="text-5xl" aria-hidden="true">◎</div>
              <h2 className="empty-state-title">
                No assessment completed yet.
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
                <div className="text-6xl font-bold text-brand-600 mb-2">
                  {Math.round(profile.overallScore)}%
                </div>
                <div className="max-w-xs mx-auto">
                  <ScoreBar score={profile.overallScore} />
                </div>
              </Card>

              {/* Discernment gap warning */}
              {profile.discernmentGap !== null && profile.discernmentGap > 15 && (
                <div
                  role="alert"
                  className="rounded-md border border-yellow-200 bg-yellow-50 p-4"
                >
                  <h2 className="text-sm font-semibold text-yellow-800 mb-1">
                    Discernment Gap Detected
                  </h2>
                  <p className="text-sm text-yellow-700">
                    Your self-reported confidence exceeds your demonstrated
                    discernment by {Math.round(profile.discernmentGap)} points.
                  </p>
                </div>
              )}

              {/* Dimensions */}
              <div className="grid gap-4 sm:grid-cols-2">
                {dimensionKeys.map((dim) => {
                  const score = profile.dimensionScores?.[dim] ?? 0;
                  return (
                    <Card key={dim} padding="md">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-gray-800">
                          {t(`profile.dimensions.${dim}`)}
                        </span>
                        <span className="text-lg font-bold text-brand-600">
                          {Math.round(score)}%
                        </span>
                      </div>
                      <ScoreBar score={score} />
                    </Card>
                  );
                })}
              </div>

              {/* Assessment date */}
              <p className="text-sm text-gray-400 text-center">
                Last assessed: {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
