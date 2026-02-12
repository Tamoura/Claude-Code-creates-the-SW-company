'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { apiClient, type WeeklyDigestData } from '../../../lib/api-client';
import { formatDate } from '../../../lib/date-format';

export default function DigestPage() {
  const t = useTranslations('digest');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const locale = useLocale();
  const [digest, setDigest] = useState<WeeklyDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getWeeklyDigest();
        if (!cancelled) setDigest(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [retryCount]);

  const dimensionBadge = (dimension: string) => {
    const styles: Record<string, string> = {
      academic: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      social_emotional: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      behavioural: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      aspirational: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      islamic: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      physical: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[dimension] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
        {td(dimension as any)}
      </span>
    );
  };

  const attentionBadge = (dimension: string) => (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      {td(dimension as any)}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-slate-700" role="alert">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            {tc('retry')}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : digest && digest.children.length > 0 ? (
        <>
          {/* Period */}
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium">{t('period')}:</span>{' '}
            <span>{formatDate(digest.period.from, locale)}</span>
            {' - '}
            <span>{formatDate(digest.period.to, locale)}</span>
          </div>

          {/* Overall Summary */}
          <div className="card border-l-4 border-l-emerald-500">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('overallSummary')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {digest.overall.totalObservations}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('totalObservations')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {digest.overall.totalMilestones}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('totalMilestones')}</div>
              </div>
            </div>
          </div>

          {/* Child Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {digest.children.map((child) => (
              <div key={child.childId} className="card hover:shadow-md transition-shadow">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
                  {child.childName}
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {child.observationCount}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t('observations')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {child.milestonesAchieved}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t('milestones')}</div>
                  </div>
                </div>

                {/* Top Dimension */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('topDimension')}</div>
                  {dimensionBadge(child.topDimension)}
                </div>

                {/* Areas Needing Attention */}
                {child.areasNeedingAttention.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('areasNeedingAttention')}</div>
                    <div className="flex flex-wrap gap-1">
                      {child.areasNeedingAttention.map((area) => (
                        <span key={area}>{attentionBadge(area)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="card text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">{t('noActivity')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('noActivityDesc')}</p>
          <Link href="/dashboard/observe" className="btn-primary text-sm py-2 px-4">
            {t('logObservation')}
          </Link>
        </div>
      )}
    </div>
  );
}
