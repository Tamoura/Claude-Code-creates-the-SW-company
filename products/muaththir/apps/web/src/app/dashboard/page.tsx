'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DIMENSIONS, getDimensionBySlug } from '../../lib/dimensions';
import DimensionCard from '../../components/dashboard/DimensionCard';
import ObservationCard from '../../components/dashboard/ObservationCard';
import QuickLog from '../../components/dashboard/QuickLog';
import { apiClient, type DashboardData, type Child, type Observation, type MilestoneDefinition } from '../../lib/api-client';
import { calculateCurrentStreak, calculateBestStreak, getStreakMessage } from '../../lib/streak';

const RadarChart = dynamic(
  () => import('../../components/dashboard/RadarChart'),
  { ssr: false, loading: () => <div className="w-full h-80 bg-slate-100 rounded-2xl animate-pulse" /> }
);

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const ts = useTranslations('streak');

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [milestonesDue, setMilestonesDue] = useState<MilestoneDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialFailures, setPartialFailures] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Load children on mount
  useEffect(() => {
    let cancelled = false;

    const loadChildren = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getChildren(1, 50);
        if (cancelled) return;

        setChildren(response.data);

        // Auto-select first child if available
        if (response.data.length > 0) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChildren();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load dashboard data and observations when child is selected
  useEffect(() => {
    if (!selectedChildId) return;

    let cancelled = false;

    const loadChildData = async () => {
      try {
        setLoading(true);
        setError(null);
        setPartialFailures([]);

        // Fetch dashboard data, recent observations, and milestones-due in parallel
        // Use allSettled so partial failures don't block the entire dashboard
        const [dashResult, obsResult, milestonesResult] = await Promise.allSettled([
          apiClient.getDashboard(selectedChildId),
          apiClient.getRecentObservations(selectedChildId),
          apiClient.getMilestonesDue(selectedChildId),
        ]);

        if (cancelled) return;

        const failures: string[] = [];

        if (dashResult.status === 'fulfilled') {
          setDashboardData(dashResult.value);
        } else {
          failures.push(t('failedDashboard'));
        }
        if (obsResult.status === 'fulfilled') {
          setObservations(obsResult.value.data);
        } else {
          failures.push(t('failedObservations'));
        }
        if (milestonesResult.status === 'fulfilled') {
          setMilestonesDue(milestonesResult.value.data);
        } else {
          failures.push(t('failedMilestones'));
        }

        if (failures.length > 0 && failures.length < 3) {
          setPartialFailures(failures);
        }

        // If all failed, show error from the first one
        if (dashResult.status === 'rejected' && obsResult.status === 'rejected' && milestonesResult.status === 'rejected') {
          throw dashResult.reason;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChildData();
    return () => {
      cancelled = true;
    };
  }, [selectedChildId, retryCount]);

  // Compute stats from dashboard data and observations
  const totalObservations = dashboardData
    ? dashboardData.dimensions.reduce((sum, d) => sum + d.observationCount, 0)
    : 0;

  const daysSinceFirst = (() => {
    if (observations.length === 0) return 0;
    const dates = observations.map((o) => new Date(o.observedAt).getTime());
    const earliest = Math.min(...dates);
    return Math.max(1, Math.floor((Date.now() - earliest) / (1000 * 60 * 60 * 24)));
  })();

  const observedAtDates = observations.map((o) => o.observedAt);
  const currentStreak = calculateCurrentStreak(observedAtDates);
  const bestStreak = calculateBestStreak(observedAtDates);
  const streakMessageKey = getStreakMessage(currentStreak);

  // Transform dashboard data to radar chart format
  const radarScores = dashboardData
    ? dashboardData.dimensions.map((d) => ({
        dimension: td(d.dimension),
        score: Math.round(d.score),
        fullMark: 100,
      }))
    : DIMENSIONS.map((d) => ({
        dimension: td(d.slug),
        score: 0,
        fullMark: 100,
      }));

  // Show "No children" state
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('addFirstChild')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {t('addFirstChildDesc')}
          </p>
          <Link href="/onboarding/child" className="btn-primary">
            {tc('addChildProfile')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {dashboardData
              ? t('subtitleWithName', { name: dashboardData.childName })
              : t('subtitleDefault')}
          </p>
        </div>

        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            aria-label={tc('selectChild')}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quick Log Form */}
      {selectedChildId && !loading && (
        <QuickLog
          childId={selectedChildId}
          onSuccess={() => setSelectedChildId((prev) => prev)}
        />
      )}

      {/* Stats Summary Row */}
      {!loading && dashboardData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('statsTotalObservations')}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="stats-total-observations">
                {totalObservations}
              </p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('statsDaysTracking')}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stats-days-tracking">
                {daysSinceFirst}
              </p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{ts('currentStreak')}</p>
              <div className="flex items-center justify-center gap-1">
                {currentStreak > 0 && (
                  <span data-testid="streak-fire-icon" className="text-xl" role="img" aria-label={ts('activeStreak')}>
                    <svg className="h-6 w-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.812 1.882-5.556 3.51-7.477A23.996 23.996 0 0012 4.5a23.996 23.996 0 003.49 4.023C17.118 10.444 19 13.188 19 16c0 3.866-3.134 7-7 7zm0-2a5 5 0 005-5c0-1.97-1.354-4.098-2.799-5.838A20.9 20.9 0 0012 7.5a20.9 20.9 0 00-2.201 2.662C8.354 11.902 7 14.03 7 16a5 5 0 005 5z" />
                    </svg>
                  </span>
                )}
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="stats-current-streak">
                  {currentStreak}
                </p>
              </div>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{ts('bestStreak')}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="stats-best-streak">
                {bestStreak}
              </p>
            </div>
          </div>
          {/* Streak motivational message */}
          <div
            className="text-center text-sm text-slate-600 dark:text-slate-400"
            data-testid="streak-message"
          >
            {ts(streakMessageKey)}
          </div>
        </div>
      )}

      {/* Partial Failure Warning */}
      {partialFailures.length > 0 && (
        <div className="card bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" role="status">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('partialLoadWarning')}</h3>
              <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
                {partialFailures.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" role="alert">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{t('errorLoading')}</h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                aria-label={tc('retry')}
              >
                {tc('retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Radar Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('developmentOverview')}
        </h2>
        {loading ? (
          <div className="w-full h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" aria-live="polite" aria-busy="true">
            <span className="sr-only">{t('loadingChart')}</span>
          </div>
        ) : (
          <>
            <RadarChart scores={radarScores} />
            {dashboardData && dashboardData.overallScore === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
                {t('startLogging')}
              </p>
            ) : (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                {t('overallScore', { score: dashboardData?.overallScore.toFixed(1) || 0 })}
              </p>
            )}
          </>
        )}
      </div>

      {/* Dimension Cards Grid */}
      <section aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('dimensions')}
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-live="polite" aria-busy="true">
            {DIMENSIONS.map((dimension) => (
              <div
                key={dimension.slug}
                className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
              >
                <span className="sr-only">{t('loadingDimension', { name: td(dimension.slug) })}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIMENSIONS.map((dimension) => {
              const dimensionData = dashboardData?.dimensions.find(
                (d) => d.dimension === dimension.slug
              );
              return (
                <DimensionCard
                  key={dimension.slug}
                  dimension={dimension}
                  score={dimensionData ? Math.round(dimensionData.score) : 0}
                  observationCount={dimensionData?.observationCount || 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Observations */}
      <section aria-labelledby="observations-heading">
        <h2 id="observations-heading" className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('recentObservations')}
        </h2>
        {loading ? (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
              >
                <span className="sr-only">{t('loadingObservation', { number: i })}</span>
              </div>
            ))}
          </div>
        ) : observations.length > 0 ? (
          <div className="space-y-3">
            {observations.map((obs) => (
              <ObservationCard
                key={obs.id}
                observation={{
                  id: obs.id,
                  dimension: obs.dimension,
                  text: obs.content,
                  sentiment: obs.sentiment as 'positive' | 'neutral' | 'needs_attention',
                  observedAt: obs.observedAt,
                  tags: obs.tags,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('noObservationsTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('noObservationsDesc')}
            </p>
            <Link
              href="/dashboard/observe"
              className="btn-primary text-sm py-2 px-4"
            >
              {t('logFirstObservation')}
            </Link>
          </div>
        )}
      </section>

      {/* Milestones Due */}
      <section aria-labelledby="milestones-heading">
        <h2 id="milestones-heading" className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('milestonesDue')}
        </h2>
        {loading ? (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse">
                <span className="sr-only">{t('loadingMilestone', { number: i })}</span>
              </div>
            ))}
          </div>
        ) : milestonesDue.length > 0 ? (
          <div className="space-y-3">
            {milestonesDue.map((milestone) => {
              const dim = getDimensionBySlug(milestone.dimension);
              return (
                <Link
                  key={milestone.id}
                  href={`/dashboard/milestones/${milestone.dimension}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ backgroundColor: dim?.colour ? `${dim.colour}20` : '#f1f5f9', color: dim?.colour || '#64748b' }}
                    >
                      {dim?.icon || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                        {milestone.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {milestone.description}
                      </p>
                      <span className="inline-block mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {td(milestone.dimension)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/dashboard/milestones"
              className="block text-center text-sm text-emerald-600 hover:text-emerald-700 mt-2"
            >
              {t('viewAllMilestones')}
            </Link>
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('allMilestonesAchieved')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('allMilestonesDesc')}
            </p>
            <Link
              href="/dashboard/milestones"
              className="btn-secondary text-sm py-2 px-4"
            >
              {t('viewMilestones')}
            </Link>
          </div>
        )}
      </section>

      {/* Floating Action Button - Log Observation */}
      <Link
        href="/dashboard/observe"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center z-40"
        aria-label={t('logNewObservation')}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
