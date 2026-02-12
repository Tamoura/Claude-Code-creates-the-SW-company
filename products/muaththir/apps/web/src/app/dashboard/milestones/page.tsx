'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DIMENSIONS } from '../../../lib/dimensions';
import { apiClient, type Child, type DashboardData } from '../../../lib/api-client';
import { SkeletonMilestones } from '../../../components/ui/Skeleton';

export default function MilestonesPage() {
  const t = useTranslations('milestonesPage');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

  // Load dashboard data when child is selected
  useEffect(() => {
    if (!selectedChildId) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getDashboard(selectedChildId);
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load milestone data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [selectedChildId, retryCount]);

  // Get milestone progress for a dimension
  const getMilestoneProgress = (dimensionSlug: string) => {
    if (!dashboardData) return { achieved: 0, total: 0 };
    const dim = dashboardData.dimensions.find((d) => d.dimension === dimensionSlug);
    return dim?.milestoneProgress || { achieved: 0, total: 0 };
  };

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('subtitle')}
          </p>
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
        <SkeletonMilestones />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIMENSIONS.map((dim) => {
            const progress = getMilestoneProgress(dim.slug);
            return (
              <Link
                key={dim.slug}
                href={`/dashboard/milestones/${dim.slug}`}
                className="card group hover:shadow-md transition-shadow"
                style={{ borderLeft: `4px solid ${dim.colour}` }}
              >
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {td(dim.slug as any)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('viewMilestonesFor', { dimension: td(dim.slug as any).toLowerCase() })}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <span>{t('completed', { count: progress.achieved })}</span>
                  <span className="mx-1">|</span>
                  <span>{t('total', { count: progress.total })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
