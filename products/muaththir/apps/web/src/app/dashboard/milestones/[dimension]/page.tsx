'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { DIMENSIONS } from '../../../../lib/dimensions';
import DimensionBadge from '../../../../components/common/DimensionBadge';
import { apiClient, type Child, type ChildMilestone } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/date-format';

interface MilestonesByDimensionPageProps {
  params: { dimension: string };
}

export default function MilestonesByDimensionPage({
  params,
}: MilestonesByDimensionPageProps) {
  const t = useTranslations('milestoneDetail');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const locale = useLocale();
  const dimension = DIMENSIONS.find((d) => d.slug === params.dimension);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<ChildMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load children on mount
  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // Auto-select first child if available
        if (response.data.length > 0) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, []);

  // Load milestones when child or dimension changes
  useEffect(() => {
    if (!selectedChildId || !dimension) return;

    const loadMilestones = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getChildMilestones(selectedChildId, {
          dimension: dimension.slug,
          limit: 100,
        });
        setMilestones(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load milestones');
      } finally {
        setLoading(false);
      }
    };

    loadMilestones();
  }, [selectedChildId, dimension, retryCount]);

  // Toggle milestone achievement with optimistic UI
  const handleToggle = async (milestoneId: string, currentAchieved: boolean) => {
    if (!selectedChildId) return;

    // Optimistic update
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
    } catch (err) {
      // Revert on error
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, achieved: currentAchieved } : m
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to update milestone');
    }
  };

  if (!dimension) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('notFound')}
        </h1>
        <Link
          href="/dashboard/milestones"
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-4 inline-block"
        >
          {t('backToMilestones')}
        </Link>
      </div>
    );
  }

  // Show "No children" state
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/milestones"
              className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {t('backToMilestones')}
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <DimensionBadge slug={dimension.slug} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('milestonesTitle', { dimension: td(dimension.slug as any) })}
          </h1>
        </div>

        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            {tc('retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            {t('noMilestonesTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('noMilestonesDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={milestone.achieved}
                  onChange={() => handleToggle(milestone.id, milestone.achieved)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  aria-label={milestone.achieved ? t('markNotAchieved', { title: milestone.title }) : t('markAchieved', { title: milestone.title })}
                />
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold ${milestone.achieved ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {milestone.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {milestone.description}
                  </p>
                  {milestone.guidance && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                      {milestone.guidance}
                    </p>
                  )}
                  {milestone.achieved && milestone.achievedAt && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                      {t('achievedOn', { date: formatDate(milestone.achievedAt, locale) })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
