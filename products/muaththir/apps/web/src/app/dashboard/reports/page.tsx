'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type DashboardData } from '../../../lib/api-client';
import ExportCSV from '../../../components/reports/ExportCSV';
import { formatDateLong } from '../../../lib/date-format';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const locale = useLocale();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getChildren(1, 50);
        if (cancelled) return;
        setChildren(res.data);
        if (res.data.length > 0) setSelectedChildId(res.data[0].id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getDashboard(selectedChildId);
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedChildId]);

  const handlePrint = () => {
    window.print();
  };

  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{tc('noChildrenYet')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('noChildrenDesc')}</p>
          <Link href="/onboarding/child" className="btn-primary">{tc('addChildProfile')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {children.length > 1 && (
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-white"
              aria-label={tc('selectChild')}
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {selectedChildId && dashboard && (
            <ExportCSV childId={selectedChildId} childName={dashboard.childName} />
          )}
          <Link href="/dashboard/reports/generate" className="btn-secondary text-sm py-2 px-4">
            {t('generateDetailed')}
          </Link>
          <button onClick={handlePrint} className="btn-primary text-sm py-2 px-4">
            {t('printReport')}
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200 print:hidden" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="space-y-6" id="report-content">
          {/* Report Header */}
          <div className="card border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{dashboard.childName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('ageBand', { band: dashboard.ageBand ? dashboard.ageBand.replace('_', ' ') : 'N/A' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{dashboard.overallScore}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('overallScore')}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              {t('reportGenerated', { date: formatDateLong(new Date(), locale) })}
            </p>
          </div>

          {/* Dimension Scores */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('dimensionScores')}</h3>
            <div className="space-y-4">
              {dashboard.dimensions.map(dimScore => {
                const dim = getDimensionBySlug(dimScore.dimension);
                const score = Math.round(dimScore.score);
                return (
                  <div key={dimScore.dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim?.colour || '#94a3b8' }} aria-hidden="true" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{td(dimScore.dimension as any)}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{score}/100</span>
                    </div>
                    <div
                      className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5"
                      role="progressbar"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${td(dimScore.dimension as any)} score: ${score} out of 100`}
                    >
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${score}%`, backgroundColor: dim?.colour || '#94a3b8' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                      <span>{t('observations', { count: dimScore.observationCount })}</span>
                      <span>
                        {t('milestonesProgress', { achieved: dimScore.milestoneProgress.achieved, total: dimScore.milestoneProgress.total })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('scoreFactors')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('dimensionHeader')}</th>
                    <th className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('observationFactor')}</th>
                    <th className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('milestoneFactor')}</th>
                    <th className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('sentimentFactor')}</th>
                    <th className="text-center py-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('totalFactor')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.dimensions.map(dimScore => {
                    return (
                      <tr key={dimScore.dimension} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{td(dimScore.dimension as any)}</span>
                        </td>
                        <td className="text-center py-2 text-xs text-slate-600 dark:text-slate-400">{dimScore.factors.observation}</td>
                        <td className="text-center py-2 text-xs text-slate-600 dark:text-slate-400">{dimScore.factors.milestone}</td>
                        <td className="text-center py-2 text-xs text-slate-600 dark:text-slate-400">{dimScore.factors.sentiment}</td>
                        <td className="text-center py-2 text-xs font-bold text-slate-900 dark:text-white">{Math.round(dimScore.score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print-only footer */}
          <div className="hidden print:block text-center text-xs text-slate-400 dark:text-slate-500 mt-8 pt-4 border-t dark:border-slate-700">
            <p>{t('generatedBy')}</p>
            <p>www.muaththir.app</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
