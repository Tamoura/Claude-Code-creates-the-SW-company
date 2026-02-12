'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getDimensionBySlug } from '../../../../lib/dimensions';
import { apiClient, type Goal, type Child } from '../../../../lib/api-client';

interface GoalDetailPageProps {
  params: { id: string };
}

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const t = useTranslations('goalDetail');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('childId');

  const [goal, setGoal] = useState<Goal | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!childIdParam) {
      setError('Missing child ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [goalData, childData] = await Promise.all([
          apiClient.getGoal(childIdParam, params.id),
          apiClient.getChild(childIdParam),
        ]);
        if (cancelled) return;
        setGoal(goalData);
        setChild(childData);
        setEditTitle(goalData.title);
        setEditDescription(goalData.description || '');
        setEditTargetDate(goalData.targetDate || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load goal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [childIdParam, params.id]);

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'paused') => {
    if (!goal || !childIdParam) return;
    try {
      const updated = await apiClient.updateGoal(childIdParam, goal.id, { status: newStatus });
      setGoal(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleSave = async () => {
    if (!goal || !childIdParam) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateGoal(childIdParam, goal.id, {
        title: editTitle,
        description: editDescription || undefined,
        targetDate: editTargetDate || undefined,
      });
      setGoal(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !childIdParam) return;
    try {
      await apiClient.deleteGoal(childIdParam, goal.id);
      router.push('/dashboard/goals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const dim = goal ? getDimensionBySlug(goal.dimension) : null;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="card h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="card h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('errorTitle')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || t('notFound')}</p>
          <Link href="/dashboard/goals" className="btn-primary">{tc('back')}</Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    completed: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    paused: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  };
  const sc = statusColors[goal.status] || statusColors.active;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard/goals" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          {t('goalsLink')}
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium truncate">{goal.title}</span>
      </nav>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
            style={{ backgroundColor: dim?.colour ? `${dim.colour}20` : '#f1f5f9', color: dim?.colour || '#64748b' }}
          >
            {dim?.icon || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-emerald-500 outline-none py-1"
                />
              ) : (
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{goal.title}</h1>
              )}
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {t(goal.status as 'active' | 'completed' | 'paused')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {td(goal.dimension as any)}
              </span>
              {child && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {child.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('descriptionLabel')}</h2>
        {editing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder={t('descriptionPlaceholder')}
          />
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {goal.description || <span className="italic text-slate-400 dark:text-slate-500">{t('noDescription')}</span>}
          </p>
        )}
      </div>

      {/* Details grid */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t('detailsLabel')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('targetDate')}</p>
            {editing ? (
              <input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            ) : (
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : t('noTarget')}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('created')}</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {new Date(goal.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('lastUpdated')}</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {new Date(goal.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('dimension')}</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{td(goal.dimension as any)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t('actionsLabel')}</h2>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !editTitle.trim()}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
              >
                {saving ? t('saving') : t('saveChanges')}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditTitle(goal.title);
                  setEditDescription(goal.description || '');
                  setEditTargetDate(goal.targetDate || '');
                }}
                className="btn-secondary text-sm py-2 px-4"
              >
                {tc('cancel')}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-2 px-4">
                {t('edit')}
              </button>
              {goal.status === 'active' && (
                <>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="text-sm py-2 px-4 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    {t('markComplete')}
                  </button>
                  <button
                    onClick={() => handleStatusChange('paused')}
                    className="text-sm py-2 px-4 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t('pause')}
                  </button>
                </>
              )}
              {goal.status === 'completed' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="text-sm py-2 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {t('reactivate')}
                </button>
              )}
              {goal.status === 'paused' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="text-sm py-2 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {t('resume')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Danger zone */}
      {!editing && (
        <div className="card border border-red-200 dark:border-red-900/50">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">{t('dangerZone')}</h2>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 flex-1">{t('deleteConfirm')}</p>
              <button
                onClick={handleDelete}
                className="text-sm py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t('confirmDelete')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary text-sm py-2 px-4"
              >
                {tc('cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm py-2 px-4 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              {t('deleteGoal')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
