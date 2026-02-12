'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient, type Child } from '../../../../lib/api-client';

interface ChildProfilePageProps {
  params: { id: string };
}

export default function ChildProfilePage({ params }: ChildProfilePageProps) {
  const router = useRouter();
  const t = useTranslations('childProfile');
  const tc = useTranslations('common');
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadChild = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getChild(params.id);
        setChild(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load child');
      } finally {
        setLoading(false);
      }
    };

    loadChild();
  }, [params.id, retryCount]);

  const handleDelete = async () => {
    if (!child) return;

    try {
      setDeleting(true);
      await apiClient.deleteChild(child.id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete child');
      setDeleting(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-slate-700" role="alert">
        <p className="text-sm text-red-700 dark:text-red-400">{error || t('childNotFound')}</p>
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            {tc('retry')}
          </button>
          <Link
            href="/dashboard"
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 mb-2 inline-block"
          >
            {t('backToDashboard')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{child.name}</h1>
        </div>
        <Link
          href={`/dashboard/child/${child.id}/edit`}
          className="btn-secondary"
        >
          {t('editProfile')}
        </Link>
      </div>

      {/* Profile Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          {t('profileInfo')}
        </h2>
        <div className="space-y-4">
          {/* Photo + Name row */}
          <div className="flex items-center gap-4 mb-4">
            {child.photoUrl ? (
              <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-slate-600 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={child.photoUrl}
                  alt={child.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600 flex-shrink-0">
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
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{child.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                {child.gender || t('notSpecified')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('name')}</label>
              <p className="text-sm text-slate-900 dark:text-white">{child.name}</p>
            </div>
            <div>
              <label className="label">{t('gender')}</label>
              <p className="text-sm text-slate-900 dark:text-white capitalize">
                {child.gender || t('notSpecified')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('dateOfBirth')}</label>
              <p className="text-sm text-slate-900 dark:text-white">
                {new Date(child.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="label">{t('age')}</label>
              <p className="text-sm text-slate-900 dark:text-white">
                {calculateAge(child.dateOfBirth)}
              </p>
            </div>
          </div>

          <div>
            <label className="label">{t('ageBand')}</label>
            <p className="text-sm text-slate-900 dark:text-white">
              {child.ageBand || t('notDetermined')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('totalObservations')}</label>
              <p className="text-sm text-slate-900 dark:text-white">
                {child.observationCount || 0}
              </p>
            </div>
            <div>
              <label className="label">{t('milestoneProgress')}</label>
              <p className="text-sm text-slate-900 dark:text-white">
                {child.milestoneProgress
                  ? `${child.milestoneProgress.achieved} / ${child.milestoneProgress.total}`
                  : t('noData')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('quickActions')}
        </h2>
        <div className="space-y-3">
          <Link
            href={`/dashboard/observe?childId=${child.id}`}
            className="btn-primary w-full"
          >
            {t('logNewObservation')}
          </Link>
          <Link
            href="/dashboard/milestones"
            className="btn-secondary w-full"
          >
            {t('viewMilestones')}
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 dark:border-red-900/50">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">
          {t('dangerZone')}
        </h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 w-full"
          >
            {t('deleteProfile')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700 dark:text-red-400">
              {t('deleteConfirm', { name: child.name })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
              >
                {deleting ? t('deleting') : t('deleteConfirmBtn')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
