'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { DashboardData } from '@/types/index';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchDashboard = async () => {
      try {
        const data = await api.get<DashboardData>('/dashboard');
        if (mounted) setDashboard(data);
      } catch {
        if (mounted) setError('Unable to load dashboard data.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      void fetchDashboard();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  const displayName = dashboard?.user?.name ?? user?.name ?? 'Learner';
  const overallScore = dashboard?.profile?.overallScore;
  const assessmentCount = dashboard?.assessmentCount ?? 0;
  const hasProfile = dashboard?.profile !== null && dashboard?.profile !== undefined;

  const statCards = [
    {
      label: 'Overall Fluency Score',
      value: hasProfile && overallScore !== undefined
        ? `${Math.round(overallScore)}%`
        : '\u2014',
      description: hasProfile
        ? 'Based on your latest assessment'
        : 'Take an assessment to see your score',
      href: hasProfile ? '/profile' : '/assessment',
      cta: hasProfile ? 'View Profile' : 'Take Assessment',
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
      description: assessmentCount > 0
        ? `${assessmentCount} assessment${assessmentCount !== 1 ? 's' : ''} completed`
        : 'Start your AI fluency journey',
      href: '/assessment',
      cta: assessmentCount > 0 ? 'Take Another' : 'Start Now',
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar />
        <div className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded bg-gray-200" />
              <div className="h-4 w-64 rounded bg-gray-200" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 rounded-lg bg-gray-200" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('dashboard.welcome')}, {displayName}
          </h1>
          <p className="mb-8 text-gray-600">
            Track your AI fluency progress and learning journey.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-md bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700"
            >
              {error}
            </div>
          )}

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {statCards.map((stat) => (
              <Card key={stat.label} padding="md">
                <div className="mb-1 text-sm font-medium text-gray-500">
                  {stat.label}
                </div>
                <div className="mb-2 text-3xl font-bold text-brand-600">
                  {stat.value}
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

          {/* Getting started */}
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Getting Started
            </h2>
            <ol className="space-y-4" role="list">
              <li className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    assessmentCount > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-brand-100 text-brand-700'
                  }`}
                  aria-hidden="true"
                >
                  {assessmentCount > 0 ? '\u2713' : '1'}
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
                    {assessmentCount > 0 ? 'Take Another' : 'Start Assessment'} &rarr;
                  </Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    hasProfile
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  aria-hidden="true"
                >
                  {hasProfile ? '\u2713' : '2'}
                </span>
                <div>
                  <p className={`font-medium ${hasProfile ? 'text-gray-900' : 'text-gray-500'}`}>
                    View your fluency profile
                  </p>
                  <p className={`text-sm ${hasProfile ? 'text-gray-500' : 'text-gray-400'}`}>
                    {hasProfile
                      ? 'Your profile is ready.'
                      : 'Complete an assessment to unlock your profile.'}
                  </p>
                  {hasProfile && (
                    <Link
                      href="/profile"
                      className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      View Profile &rarr;
                    </Link>
                  )}
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
        </div>
      </div>
    </div>
  );
}
