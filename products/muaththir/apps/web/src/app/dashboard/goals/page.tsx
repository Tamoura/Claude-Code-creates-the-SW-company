'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getDimensionBySlug } from '../../../lib/dimensions';
import { apiClient, type Child, type Goal } from '../../../lib/api-client';
import { formatDate } from '../../../lib/date-format';

export default function GoalsPage() {
  const t = useTranslations('goals');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const locale = useLocale();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

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
        const params: { status?: string } = {};
        if (filterStatus) params.status = filterStatus;
        const res = await apiClient.getGoals(selectedChildId, params);
        if (!cancelled) setGoals(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load goals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedChildId, filterStatus]);

  const handleStatusChange = async (goal: Goal, newStatus: 'active' | 'completed' | 'paused') => {
    if (!selectedChildId) return;
    try {
      const updated = await apiClient.updateGoal(selectedChildId, goal.id, { status: newStatus });
      setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!selectedChildId) return;
    try {
      await apiClient.deleteGoal(selectedChildId, goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      completed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      paused: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.active}`}>
        {t(status as 'active' | 'completed' | 'paused')}
      </span>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {children.length > 1 && (
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              aria-label={tc('selectChild')}
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {selectedChildId && (
            <Link
              href={`/dashboard/goals/new?childId=${selectedChildId}`}
              className="btn-primary text-sm py-2 px-4"
            >
              {t('newGoal')}
            </Link>
          )}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['', 'active', 'completed', 'paused'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {s ? t(s as 'active' | 'completed' | 'paused') : t('all')}
          </button>
        ))}
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700" role="alert">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">{t('noGoalsTitle')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('noGoalsDesc')}</p>
          {selectedChildId && (
            <Link href={`/dashboard/goals/new?childId=${selectedChildId}`} className="btn-primary text-sm py-2 px-4">
              {t('createFirstGoal')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const dim = getDimensionBySlug(goal.dimension);
            return (
              <div key={goal.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ backgroundColor: dim?.colour ? `${dim.colour}20` : '#f1f5f9', color: dim?.colour || '#64748b' }}
                  >
                    {dim?.icon || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/dashboard/goals/${goal.id}?childId=${selectedChildId}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {goal.title}
                      </Link>
                      {statusBadge(goal.status)}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      <span>{td(goal.dimension as any)}</span>
                      {goal.targetDate && (
                        <span>{t('target', { date: formatDate(goal.targetDate, locale) })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {goal.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(goal, 'completed')}
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                        aria-label={t('markComplete')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    {goal.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(goal, 'paused')}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label={t('pause')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {goal.status !== 'active' && (
                      <button
                        onClick={() => handleStatusChange(goal, 'active')}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        aria-label={t('reactivate')}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      aria-label={tc('delete')}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
