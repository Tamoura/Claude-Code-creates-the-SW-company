'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type InsightsData } from '../../../lib/api-client';

export default function InsightsPage() {
  const t = useTranslations('insights');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
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
        const data = await apiClient.getInsights(selectedChildId);
        if (!cancelled) setInsights(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedChildId]);

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <span className="text-emerald-500" title={t('improving')}>&#9650;</span>;
    if (trend === 'declining') return <span className="text-red-500" title={t('declining')}>&#9660;</span>;
    if (trend === 'needs_attention') return <span className="text-amber-500" title={t('needsAttention')}>&#9888;</span>;
    if (trend === 'no_data') return <span className="text-slate-300" title={t('noData')}>&mdash;</span>;
    return <span className="text-slate-400" title={t('stable')}>&#9644;</span>;
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-50 text-red-700',
      medium: 'bg-amber-50 text-amber-700',
      low: 'bg-blue-50 text-blue-700',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[priority] || styles.low}`}>
        {priority}
      </span>
    );
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            aria-label={tc('selectChild')}
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : insights ? (
        <>
          {/* Summary */}
          <div className="card border-l-4 border-l-emerald-500">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('summary')}</h2>
            <p className="text-sm text-slate-600">{insights.summary}</p>
          </div>

          {/* Strengths */}
          {insights.strengths.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('strengths')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insights.strengths.map((s, i) => {
                  const dim = getDimensionBySlug(s.dimension);
                  return (
                    <div key={i} className="card border-t-4" style={{ borderTopColor: dim?.colour || '#10B981' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold" style={{ color: dim?.colour || '#10B981' }}>
                          {s.score}
                        </span>
                        <span className="text-xs text-slate-400">/100</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">{s.title}</h3>
                      <p className="text-xs text-slate-500">{s.detail}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Areas for Growth */}
          {insights.areasForGrowth.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('areasForGrowth')}</h2>
              <div className="space-y-3">
                {insights.areasForGrowth.map((a, i) => {
                  const dim = getDimensionBySlug(a.dimension);
                  return (
                    <div key={i} className="card">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: dim?.colour ? `${dim.colour}20` : '#fef3c7', color: dim?.colour || '#f59e0b' }}
                        >
                          {a.score}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 mb-1">{a.title}</h3>
                          <p className="text-xs text-slate-500 mb-2">{a.detail}</p>
                          {a.suggestions.length > 0 && (
                            <ul className="space-y-1">
                              {a.suggestions.map((suggestion, j) => (
                                <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                                  <svg className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                  </svg>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('recommendations')}</h2>
              <div className="space-y-2">
                {insights.recommendations.map((r, i) => (
                  <div key={i} className="card flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {priorityBadge(r.priority)}
                    </div>
                    <p className="text-sm text-slate-700">{r.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Dimension Trends */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('dimensionTrends')}</h2>
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-600">{t('overall')}</span>
                <span className="text-sm font-medium text-slate-900 capitalize">
                  {insights.trends.overallDirection.replace('_', ' ')}
                </span>
                {trendIcon(insights.trends.overallDirection)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(insights.trends.dimensionTrends).map(([dim, trend]) => {
                  const dimInfo = getDimensionBySlug(dim);
                  return (
                    <div key={dim} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dimInfo?.colour || '#94a3b8' }}
                      />
                      <span className="text-xs text-slate-600 flex-1">{td(dim as any)}</span>
                      {trendIcon(trend)}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <p className="text-xs text-slate-400 text-center">
            {t('generatedAt', { time: new Date(insights.generatedAt).toLocaleString() })}
          </p>
        </>
      ) : (
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 mb-1">{t('noInsightsTitle')}</h3>
          <p className="text-xs text-slate-500 mb-4">
            {t('noInsightsDesc')}
          </p>
          <Link href="/dashboard/observe" className="btn-primary text-sm py-2 px-4">
            {t('logObservation')}
          </Link>
        </div>
      )}
    </div>
  );
}
