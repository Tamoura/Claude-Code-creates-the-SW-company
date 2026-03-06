'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
import type { FluencyProfile, DetailedFluencyProfile } from '@/types/index';

export default function DashboardPage() {
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
        // Graceful degradation — show empty state
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const overallScore = profile
    ? Math.round(profile.overallScore)
    : null;
  const assessmentCount = history.length;

  const statCards = [
    {
      label: 'Overall Fluency Score',
      value: overallScore !== null ? String(overallScore) : '\u2014',
      description: overallScore !== null
        ? 'Your latest AI fluency score'
        : 'Take an assessment to see your score',
      href: overallScore !== null ? '/profile' : '/assessment',
      cta: overallScore !== null ? 'View Profile' : 'Take Assessment',
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
      value: String(assessmentCount),
      description:
        assessmentCount > 0
          ? `Last assessed ${profile?.lastAssessedAt ? new Date(profile.lastAssessedAt).toLocaleDateString() : 'recently'}`
          : 'Start your AI fluency journey',
      href: '/assessment',
      cta: assessmentCount > 0 ? 'Retake Assessment' : 'Start Now',
    },
  ];

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
                  {isLoading ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
                  ) : (
                    stat.value
                  )}
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

          {/* Getting started / Dimension breakdown */}
          {profile ? (
            <Card padding="lg">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Your Dimension Breakdown
              </h2>
              <div className="space-y-4">
                {(
                  [
                    ['DELEGATION', 'Delegation'],
                    ['DESCRIPTION', 'Description'],
                    ['DISCERNMENT', 'Discernment'],
                    ['DILIGENCE', 'Diligence'],
                  ] as const
                ).map(([key, label]) => {
                  const score = Math.round(
                    profile.dimensionScores[key] ?? 0,
                  );
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {label}
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
                        aria-label={`${label} score: ${score} out of 100`}
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
              <div className="mt-4">
                <Link
                  href="/profile"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View full profile &rarr;
                </Link>
              </div>
            </Card>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
