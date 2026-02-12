'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DIMENSIONS } from '../../../../lib/dimensions';
import DimensionBadge from '../../../../components/common/DimensionBadge';
import { apiClient, type Child, type Observation, type DashboardData, type ChildMilestone } from '../../../../lib/api-client';

interface DimensionDetailPageProps {
  params: { slug: string };
}

export default function DimensionDetailPage({
  params,
}: DimensionDetailPageProps) {
  const t = useTranslations('dimensionDetail');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const ttl = useTranslations('timeline');
  const tm = useTranslations('milestonePreview');

  const dimension = DIMENSIONS.find((d) => d.slug === params.slug);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [milestones, setMilestones] = useState<ChildMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Fetch children on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // If only one child, select automatically
        if (response.data.length === 1) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, []);

  // Fetch observations and dashboard data when child is selected
  useEffect(() => {
    if (!selectedChildId || !dimension) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [obsResponse, dashData] = await Promise.all([
          apiClient.getObservations(selectedChildId, {
            dimension: dimension.slug,
            limit: 20,
          }),
          apiClient.getDashboard(selectedChildId),
        ]);

        setObservations(obsResponse.data);
        setDashboardData(dashData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedChildId, dimension, retryCount]);

  // Fetch milestones when child is selected
  useEffect(() => {
    if (!selectedChildId || !dimension) return;

    const fetchMilestones = async () => {
      try {
        setMilestonesLoading(true);
        const response = await apiClient.getChildMilestones(selectedChildId, {
          dimension: dimension.slug,
          limit: 5,
        });
        setMilestones(response.data);
      } catch {
        // Silently fail - milestone preview is supplementary
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [selectedChildId, dimension]);

  // Toggle milestone achievement with optimistic UI
  const handleToggleMilestone = async (milestoneId: string, currentAchieved: boolean) => {
    if (!selectedChildId) return;

    const newAchieved = !currentAchieved;
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? { ...m, achieved: newAchieved, achievedAt: newAchieved ? new Date().toISOString() : null }
          : m
      )
    );

    try {
      await apiClient.toggleMilestone(selectedChildId, milestoneId, newAchieved);
    } catch {
      // Revert on error
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, achieved: currentAchieved } : m
        )
      );
    }
  };

  const getDimensionScore = (): number => {
    if (!dashboardData || !dimension) return 0;
    const dimData = dashboardData.dimensions.find((d) => d.dimension === dimension.slug);
    return dimData?.score || 0;
  };

  const getObservationCount = (): number => {
    if (!dashboardData || !dimension) return 0;
    const dimData = dashboardData.dimensions.find((d) => d.dimension === dimension.slug);
    return dimData?.observationCount || 0;
  };

  if (!dimension) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('notFound')}
        </h1>
        <Link
          href="/dashboard/dimensions"
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-4 inline-block"
        >
          {t('backToDimensions')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-2xl"
            style={{ backgroundColor: `${dimension.colour}15` }}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke={dimension.colour}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {td(dimension.slug)}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {td(`${dimension.slug}Desc`)}
            </p>
          </div>
        </div>
        <DimensionBadge slug={dimension.slug} size="md" />
      </div>

      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <div>
          <label htmlFor="child-select-dimension" className="label">
            {tc('selectChild')}
          </label>
          <select
            id="child-select-dimension"
            className="input-field max-w-xs"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            <option value="">{tc('chooseChild')}</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-slate-700">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            {tc('retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !dashboardData && (
        <div className="card py-12 text-center">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mx-auto animate-pulse" />
        </div>
      )}

      {/* No child selected */}
      {!selectedChildId && !isLoading && (
        <div className="card text-center py-16">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            {t('noChildSelected')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('noChildSelectedDesc')}
          </p>
        </div>
      )}

      {/* Score Card */}
      {selectedChildId && dashboardData && (
        <>
          <div
            className="card"
            style={{ borderLeft: `4px solid ${dimension.colour}` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('currentScore')}
                </h2>
                <p
                  className="text-4xl font-bold mt-1"
                  style={{ color: dimension.colour }}
                >
                  {getDimensionScore()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('observations')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {getObservationCount()}
                </p>
              </div>
            </div>
          </div>

          {/* Observations */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('recentObservations')}
            </h2>
            {observations.length === 0 ? (
              <div className="card text-center py-12">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  {t('noObservationsIn', { dimension: td(dimension.slug) })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {t('startLogging')}
                </p>
                <Link
                  href="/dashboard/observe"
                  className="btn-primary text-sm py-2 px-4"
                >
                  {t('logObservation')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="card"
                    style={{ borderLeft: `4px solid ${dimension.colour}` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            obs.sentiment === 'positive'
                              ? '#10B98115'
                              : obs.sentiment === 'neutral'
                              ? '#94A3B815'
                              : '#F59E0B15',
                          color:
                            obs.sentiment === 'positive'
                              ? '#10B981'
                              : obs.sentiment === 'neutral'
                              ? '#94A3B8'
                              : '#F59E0B',
                        }}
                      >
                        {obs.sentiment === 'positive'
                          ? ttl('positive')
                          : obs.sentiment === 'neutral'
                          ? ttl('neutral')
                          : ttl('needsAttention')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(obs.observedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{obs.content}</p>

                    {obs.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {obs.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Milestones Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {tm('title')}
          </h2>
          <Link
            href={`/dashboard/milestones/${dimension.slug}`}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            {tm('viewAll')}
          </Link>
        </div>

        {milestonesLoading ? (
          <div className="card py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tm('loading')}
            </p>
          </div>
        ) : !selectedChildId ? (
          <div className="card text-center py-12">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              {t('noChildSelected')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('noChildSelectedDesc')}
            </p>
          </div>
        ) : milestones.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tm('noMilestones')}
            </p>
          </div>
        ) : (
          <div className="card space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => handleToggleMilestone(milestone.id, milestone.achieved)}
                  className="flex-shrink-0"
                  aria-label={milestone.achieved ? tm('achieved') : tm('notAchieved')}
                >
                  {milestone.achieved ? (
                    <svg
                      className="h-5 w-5 text-emerald-500 dark:text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-slate-300 dark:text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </button>
                <span
                  className={`text-sm ${
                    milestone.achieved
                      ? 'text-slate-500 dark:text-slate-500 line-through'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {milestone.title}
                </span>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <Link
                href={`/dashboard/milestones/${dimension.slug}`}
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {tm('viewAll')} &rarr;
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
