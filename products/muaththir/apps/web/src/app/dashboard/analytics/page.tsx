'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DIMENSIONS, getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type Observation } from '../../../lib/api-client';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load children on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getChildren(1, 50);
        setChildren(res.data);
        if (res.data.length > 0) {
          setSelectedChildId(res.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load observations for selected child
  useEffect(() => {
    if (!selectedChildId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.getObservations(selectedChildId, { limit: 200 });
        setObservations(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load observations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedChildId]);

  // Count observations per dimension
  const dimensionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dim of DIMENSIONS) {
      counts[dim.slug] = 0;
    }
    for (const obs of observations) {
      if (counts[obs.dimension] !== undefined) {
        counts[obs.dimension]++;
      }
    }
    return counts;
  }, [observations]);

  // Find most active dimension
  const mostActiveDimension = useMemo(() => {
    let maxSlug = '';
    let maxCount = 0;
    for (const [slug, count] of Object.entries(dimensionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSlug = slug;
      }
    }
    return maxSlug;
  }, [dimensionCounts]);

  // Sentiment distribution
  const sentimentCounts = useMemo(() => {
    const counts: Record<string, number> = { positive: 0, neutral: 0, needs_attention: 0 };
    for (const obs of observations) {
      if (counts[obs.sentiment] !== undefined) {
        counts[obs.sentiment]++;
      }
    }
    return counts;
  }, [observations]);

  // Max count for bar scaling
  const maxDimensionCount = useMemo(() => {
    return Math.max(...Object.values(dimensionCounts), 1);
  }, [dimensionCounts]);

  // No children state
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

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
        <div className="card bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800" role="alert">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : observations.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            {t('noObservations')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t('noObservationsDesc')}
          </p>
          <Link href="/dashboard/observe" className="btn-primary text-sm py-2 px-4">
            {t('logObservation')}
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('totalObservations')}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="total-observations-count">
                {observations.length}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('mostActiveDimension')}</p>
              <p className="text-lg font-bold" data-testid="most-active-dimension" style={{ color: getDimensionBySlug(mostActiveDimension)?.colour }}>
                {mostActiveDimension ? td(mostActiveDimension as any) : '-'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {dimensionCounts[mostActiveDimension] || 0} {t('observationsLabel')}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('dimensionsCovered')}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {Object.values(dimensionCounts).filter((c) => c > 0).length}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('outOf6')}</p>
            </div>
          </div>

          {/* Observations by Dimension - Bar Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('observationsByDimension')}
            </h2>
            <div className="space-y-3">
              {DIMENSIONS.map((dim) => {
                const count = dimensionCounts[dim.slug] || 0;
                const widthPercent = maxDimensionCount > 0 ? (count / maxDimensionCount) * 100 : 0;
                return (
                  <div key={dim.slug} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 truncate">
                      {td(dim.slug as any)}
                    </span>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pe-2 transition-all duration-500"
                        style={{
                          width: `${Math.max(widthPercent, count > 0 ? 8 : 0)}%`,
                          backgroundColor: dim.colour,
                        }}
                        data-testid={`analytics-bar-${dim.slug}`}
                      >
                        {count > 0 && (
                          <span className="text-xs font-bold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('sentimentDistribution')}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {sentimentCounts.positive}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('positive')}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                  {sentimentCounts.neutral}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('neutral')}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {sentimentCounts.needs_attention}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('needsAttention')}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
