'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DIMENSIONS, getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type DashboardData } from '../../../lib/api-client';

export default function ReportsPage() {
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Children Yet</h2>
          <p className="text-sm text-slate-500 mb-6">Add a child profile to generate reports.</p>
          <Link href="/onboarding/child" className="btn-primary">Add Child Profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Progress Report</h1>
          <p className="text-sm text-slate-500 mt-1">View and print your child&apos;s development summary.</p>
        </div>
        <div className="flex items-center gap-3">
          {children.length > 1 && (
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              aria-label="Select child"
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={handlePrint} className="btn-primary text-sm py-2 px-4">
            Print Report
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
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="space-y-6" id="report-content">
          {/* Report Header */}
          <div className="card border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{dashboard.childName}</h2>
                <p className="text-sm text-slate-500">
                  Age Band: {dashboard.ageBand ? dashboard.ageBand.replace('_', ' ') : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-600">{dashboard.overallScore}</p>
                <p className="text-xs text-slate-500">Overall Score</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Report generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Dimension Scores */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Dimension Scores</h3>
            <div className="space-y-4">
              {dashboard.dimensions.map(dimScore => {
                const dim = getDimensionBySlug(dimScore.dimension);
                const score = Math.round(dimScore.score);
                return (
                  <div key={dimScore.dimension}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dim?.colour || '#94a3b8' }} />
                        <span className="text-sm font-medium text-slate-700">{dim?.name || dimScore.dimension}</span>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Score Factors</h3>
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
                  {dashboard.dimensions.map(dimScore => {
                    const dim = getDimensionBySlug(dimScore.dimension);
                    return (
                      <tr key={dimScore.dimension} className="border-b border-slate-100">
                        <td className="py-2">
                          <span className="text-xs font-medium text-slate-700">{dim?.name || dimScore.dimension}</span>
                        </td>
                        <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.observation}</td>
                        <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.milestone}</td>
                        <td className="text-center py-2 text-xs text-slate-600">{dimScore.factors.sentiment}</td>
                        <td className="text-center py-2 text-xs font-bold text-slate-900">{Math.round(dimScore.score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print-only footer */}
          <div className="hidden print:block text-center text-xs text-slate-400 mt-8 pt-4 border-t">
            <p>Generated by Mu&apos;aththir - Holistic Child Development Tracker</p>
            <p>www.muaththir.app</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
