'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../../../lib/dimensions';
import { apiClient, type Child, type ReportSummaryData } from '../../../../lib/api-client';

export default function GenerateReportPage() {
  const t = useTranslations('generateReport');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');

  // State for configuration step
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // State for report display step
  const [report, setReport] = useState<ReportSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load children on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.getChildren(1, 50);
        if (cancelled) return;
        setChildren(res.data);
        if (res.data.length > 0) {
          setSelectedChildId(res.data[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load children');
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async () => {
    if (!selectedChildId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getReportSummary(selectedChildId, {
        from: fromDate,
        to: toDate,
      });
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return t('highPriority');
      case 'medium': return t('mediumPriority');
      case 'low': return t('lowPriority');
    }
  };

  // If no children exist
  if (!loading && children.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{tc('noChildrenYet')}</h2>
          <p className="text-sm text-slate-500 mb-6">{t('description')}</p>
          <Link href="/onboarding/child" className="btn-primary">{tc('addChildProfile')}</Link>
        </div>
      </div>
    );
  }

  // Configuration step - show if no report generated yet
  if (!report) {
    return (
      <div className="space-y-6">
        <div className="print:hidden">
          <Link href="/dashboard/reports" className="text-sm text-emerald-600 hover:text-emerald-700 mb-4 inline-block">
            ← {t('backToReports')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('dateRange')}</h2>

          {children.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {tc('selectChild')}
              </label>
              <select
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('from')}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('to')}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedChildId}
            className="btn-primary w-full md:w-auto"
          >
            {loading ? t('generating') : t('generate')}
          </button>
        </div>
      </div>
    );
  }

  // Display step - show the full report
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-block">
            ← {t('backToReports')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500">
            {t('reportPeriod', { from: new Date(report.dateRange.from).toLocaleDateString(), to: new Date(report.dateRange.to).toLocaleDateString() })}
          </p>
        </div>
        <button onClick={handlePrint} className="btn-primary text-sm py-2 px-4">
          {t('printReport')}
        </button>
      </div>

      {/* Report Header */}
      <div className="card border-t-4 border-t-emerald-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{report.childName}</h2>
            <p className="text-sm text-slate-500">
              {report.ageBand ? report.ageBand.replace('_', ' ') : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{report.overallScore}</p>
            <p className="text-xs text-slate-500">{t('overallScore')}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* AI Insights Summary */}
      {report.insights && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('insightsSummary')}</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{report.insights.summary}</p>
        </div>
      )}

      {/* Strengths */}
      {report.insights?.strengths && report.insights.strengths.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('strengthsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.insights.strengths.map((strength, idx) => {
              const dim = getDimensionBySlug(strength.dimension);
              return (
                <div key={idx} className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim?.colour || '#10B981' }} />
                      <span className="text-sm font-semibold text-slate-900">{strength.title}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{strength.score}/100</span>
                  </div>
                  <p className="text-xs text-slate-600">{strength.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Areas for Growth */}
      {report.insights?.areasForGrowth && report.insights.areasForGrowth.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('growthTitle')}</h3>
          <div className="space-y-4">
            {report.insights.areasForGrowth.map((area, idx) => {
              const dim = getDimensionBySlug(area.dimension);
              return (
                <div key={idx} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim?.colour || '#F59E0B' }} />
                      <span className="text-sm font-semibold text-slate-900">{area.title}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{area.score}/100</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{area.detail}</p>
                  {area.suggestions && area.suggestions.length > 0 && (
                    <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                      {area.suggestions.map((suggestion, sidx) => (
                        <li key={sidx}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension Scores */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('dimensionScores')}</h3>
        <div className="space-y-4">
          {report.dimensions.map(dimScore => {
            const dim = getDimensionBySlug(dimScore.dimension);
            const score = Math.round(dimScore.score);
            return (
              <div key={dimScore.dimension}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim?.colour || '#94a3b8' }} />
                    <span className="text-sm font-medium text-slate-700">{td(dimScore.dimension as any)}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: dim?.colour || '#94a3b8' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{dimScore.observationCount} observations</span>
                  <span>
                    {dimScore.milestoneProgress.achieved}/{dimScore.milestoneProgress.total} milestones
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('scoreFactors')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-medium text-slate-500">Dimension</th>
                <th className="text-center py-2 text-xs font-medium text-slate-500">Observation (40%)</th>
                <th className="text-center py-2 text-xs font-medium text-slate-500">Milestone (40%)</th>
                <th className="text-center py-2 text-xs font-medium text-slate-500">Sentiment (20%)</th>
                <th className="text-center py-2 text-xs font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.dimensions.map(dimScore => (
                <tr key={dimScore.dimension} className="border-b border-slate-100">
                  <td className="py-2">
                    <span className="text-xs font-medium text-slate-700">{td(dimScore.dimension as any)}</span>
                  </td>
                  <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.observation}</td>
                  <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.milestone}</td>
                  <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.sentiment}</td>
                  <td className="text-center py-2 text-xs font-bold text-slate-900">{Math.round(dimScore.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('milestoneProgress')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">{report.milestoneProgress.totalAchieved}</p>
            <p className="text-xs text-slate-600">{t('achieved', { count: report.milestoneProgress.totalAchieved })}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-600">{report.milestoneProgress.totalAvailable - report.milestoneProgress.totalAchieved}</p>
            <p className="text-xs text-slate-600">{t('remaining', { count: report.milestoneProgress.totalAvailable - report.milestoneProgress.totalAchieved })}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{report.milestoneProgress.totalAvailable}</p>
            <p className="text-xs text-slate-600">Total</p>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(report.milestoneProgress.byDimension).map(([dimension, progress]) => {
            const dim = getDimensionBySlug(dimension);
            const percentage = progress.total > 0 ? Math.round((progress.achieved / progress.total) * 100) : 0;
            return (
              <div key={dimension}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dim?.colour || '#94a3b8' }} />
                    <span className="text-xs font-medium text-slate-700">{td(dimension as any)}</span>
                  </div>
                  <span className="text-xs text-slate-600">{progress.achieved}/{progress.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: dim?.colour || '#94a3b8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goals Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('goalsOverview')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{report.goals.active}</p>
            <p className="text-xs text-slate-600">{t('activeGoals')}</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">{report.goals.completed}</p>
            <p className="text-xs text-slate-600">{t('completedGoals')}</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{report.goals.paused}</p>
            <p className="text-xs text-slate-600">{t('pausedGoals')}</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {report.insights?.recommendations && report.insights.recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('recommendationsTitle')}</h3>
          <div className="space-y-3">
            {report.insights.recommendations.map((rec, idx) => (
              <div key={idx} className={`p-3 border rounded-lg ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium flex-1">{rec.message}</p>
                  <span className="text-xs font-semibold uppercase ml-2">{getPriorityLabel(rec.priority)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Observations */}
      {report.recentObservations && report.recentObservations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('recentObservations')}</h3>
          <div className="space-y-3">
            {report.recentObservations.map(obs => {
              const dim = getDimensionBySlug(obs.dimension);
              const sentimentColor = obs.sentiment === 'positive' ? 'text-emerald-600' : obs.sentiment === 'needs_attention' ? 'text-red-600' : 'text-slate-600';
              return (
                <div key={obs.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dim?.colour || '#94a3b8' }} />
                      <span className="text-xs font-medium text-slate-700">{td(obs.dimension as any)}</span>
                    </div>
                    <span className={`text-xs font-medium ${sentimentColor}`}>
                      {obs.sentiment.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{obs.content}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(obs.observedAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-slate-400 mt-8 pt-4 border-t">
        <p>Generated by Mu&apos;aththir - Holistic Child Development Tracker</p>
        <p>www.muaththir.app</p>
      </div>
    </div>
  );
}
