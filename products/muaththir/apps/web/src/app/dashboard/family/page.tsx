'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { DIMENSIONS, getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type DashboardData } from '../../../lib/api-client';

const RadarChart = dynamic(
  () => import('../../../components/dashboard/RadarChart'),
  { ssr: false, loading: () => <div className="w-full h-64 bg-slate-100 rounded-2xl animate-pulse" /> }
);

interface ChildWithScores extends Child {
  dashboard?: DashboardData;
}

export default function FamilyPage() {
  const t = useTranslations('family');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const [children, setChildren] = useState<ChildWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getChildren(1, 50);
        if (cancelled) return;

        const childrenWithScores = await Promise.all(
          res.data.map(async (child) => {
            try {
              const dashboard = await apiClient.getDashboard(child.id);
              return { ...child, dashboard };
            } catch {
              return { ...child, dashboard: undefined };
            }
          })
        );

        if (!cancelled) setChildren(childrenWithScores);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{tc('noChildrenYet')}</h2>
          <p className="text-sm text-slate-500 mb-6">{t('noChildrenDesc')}</p>
          <Link href="/onboarding/child" className="btn-primary">{tc('addChildProfile')}</Link>
        </div>
      </div>
    );
  }

  if (!loading && children.length === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
        </div>
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 mb-1">{t('onlyOneChild')}</h3>
          <p className="text-xs text-slate-500 mb-4">
            {t('onlyOneChildDesc')}
          </p>
          <Link href="/onboarding/child" className="btn-primary text-sm py-2 px-4">
            {t('addAnotherChild')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Child Cards with Radar Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {children.map(child => {
              const radarScores = child.dashboard
                ? child.dashboard.dimensions.map(d => ({
                    dimension: getDimensionBySlug(d.dimension)?.name || d.dimension,
                    score: Math.round(d.score),
                    fullMark: 100,
                  }))
                : DIMENSIONS.map(d => ({ dimension: d.name, score: 0, fullMark: 100 }));

              return (
                <div key={child.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{child.name}</h2>
                      <p className="text-xs text-slate-500">
                        {child.ageBand ? child.ageBand.replace('_', ' ') : 'Unknown'} &middot; Overall: {child.dashboard?.overallScore || 0}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/child/${child.id}`}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {tc('viewDetails')}
                    </Link>
                  </div>
                  <RadarChart scores={radarScores} />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{child.observationCount || 0}</p>
                      <p className="text-xs text-slate-500">{t('observationsLabel')}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{child.milestoneProgress?.achieved || 0}</p>
                      <p className="text-xs text-slate-500">{t('milestonesLabel')}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-emerald-600">{child.dashboard?.overallScore || 0}</p>
                      <p className="text-xs text-slate-500">{t('scoreLabel')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dimension Comparison Table */}
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('dimensionComparison')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500">{t('dimensionHeader')}</th>
                  {children.map(child => (
                    <th key={child.id} className="text-center py-2 px-2 text-xs font-medium text-slate-500">
                      {child.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map(dim => (
                  <tr key={dim.slug} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dim.colour }} />
                        <span className="text-xs font-medium text-slate-700">{td(dim.slug as any)}</span>
                      </div>
                    </td>
                    {children.map(child => {
                      const score = child.dashboard?.dimensions.find(d => d.dimension === dim.slug)?.score || 0;
                      return (
                        <td key={child.id} className="text-center py-2.5 px-2">
                          <span className={`text-sm font-bold ${score >= 60 ? 'text-emerald-600' : score >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                            {Math.round(score)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
