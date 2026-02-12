'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DIMENSIONS } from '../../../lib/dimensions';
import {
  apiClient,
  type Child,
  type DashboardData,
} from '../../../lib/api-client';

const RadarChart = dynamic(
  () => import('../../../components/dashboard/RadarChart'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
    ),
  }
);

export default function ComparePage() {
  const t = useTranslations('compare');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dashboards, setDashboards] = useState<
    Record<string, DashboardData>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load children on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getChildren(1, 50);
        if (cancelled) return;
        setChildren(response.data);

        // Auto-select all children
        if (response.data.length >= 2) {
          setSelectedIds(response.data.map((c) => c.id));
        }
      } catch {
        if (cancelled) return;
        setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load dashboard data for selected children
  useEffect(() => {
    if (selectedIds.length < 2) return;
    let cancelled = false;

    const loadDashboards = async () => {
      const results: Record<string, DashboardData> = {};
      const promises = selectedIds.map(async (childId) => {
        try {
          const data = await apiClient.getDashboard(childId);
          if (!cancelled) {
            results[childId] = data;
          }
        } catch {
          // Skip failed dashboard loads
        }
      });

      await Promise.all(promises);
      if (!cancelled) {
        setDashboards(results);
      }
    };

    loadDashboards();
    return () => {
      cancelled = true;
    };
  }, [selectedIds]);

  // Transform dashboard data to radar chart format
  const getRadarScores = (data: DashboardData) =>
    data.dimensions.map((d) => ({
      dimension: td(d.dimension),
      score: Math.round(d.score),
      fullMark: 100,
    }));

  // Get dimension score for a specific child
  const getDimScore = (childId: string, dimSlug: string): number => {
    const dash = dashboards[childId];
    if (!dash) return 0;
    const dim = dash.dimensions.find((d) => d.dimension === dimSlug);
    return dim ? Math.round(dim.score) : 0;
  };

  // No children state
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('noChildren')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {t('noChildrenDesc')}
          </p>
          <Link href="/onboarding/child" className="btn-primary">
            {tc('addChildProfile')}
          </Link>
        </div>
      </div>
    );
  }

  // Need two children state
  if (!loading && children.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('needTwoChildren')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {t('needTwoChildrenDesc')}
          </p>
          <Link href="/onboarding/child" className="btn-primary">
            {t('addChild')}
          </Link>
        </div>
      </div>
    );
  }

  const selectedChildren = children.filter((c) =>
    selectedIds.includes(c.id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Child selector chips */}
      <div className="flex flex-wrap gap-2">
        {children.map((child) => {
          const isSelected = selectedIds.includes(child.id);
          return (
            <button
              key={child.id}
              onClick={() => {
                if (isSelected) {
                  setSelectedIds((prev) =>
                    prev.filter((id) => id !== child.id)
                  );
                } else {
                  setSelectedIds((prev) => [...prev, child.id]);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-600'
                  : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {child.name}
            </button>
          );
        })}
      </div>

      {/* Radar Charts Grid */}
      {selectedIds.length >= 2 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          data-testid="comparison-grid"
        >
          {selectedChildren.map((child) => {
            const data = dashboards[child.id];
            return (
              <div key={child.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {child.name}
                  </h3>
                  {data && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('overallScore')}
                      </p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round(data.overallScore)}
                      </p>
                    </div>
                  )}
                </div>
                {data ? (
                  <RadarChart scores={getRadarScores(data)} />
                ) : (
                  <div className="w-full h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      {t('noScoresYet')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dimension Breakdown Table */}
      {selectedIds.length >= 2 &&
        Object.keys(dashboards).length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('dimensionBreakdown')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-start py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">
                      {t('dimensionColumn')}
                    </th>
                    {selectedChildren.map((child) => (
                      <th
                        key={child.id}
                        className="text-center py-3 px-2 text-slate-500 dark:text-slate-400 font-medium"
                      >
                        {child.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((dim) => (
                    <tr
                      key={dim.slug}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dim.colour }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {td(dim.slug)}
                          </span>
                        </div>
                      </td>
                      {selectedChildren.map((child) => {
                        const score = getDimScore(child.id, dim.slug);
                        return (
                          <td
                            key={child.id}
                            className="text-center py-3 px-2"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {score}
                              </span>
                              <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${score}%`,
                                    backgroundColor: dim.colour,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
