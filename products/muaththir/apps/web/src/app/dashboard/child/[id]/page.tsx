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
  }, [params.id]);

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
      <div className="card bg-red-50 border-red-200">
        <p className="text-sm text-red-700">{error || t('childNotFound')}</p>
        <Link
          href="/dashboard"
          className="text-sm text-emerald-600 hover:text-emerald-700 mt-4 inline-block"
        >
          {t('backToDashboard')}
        </Link>
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
            className="text-sm text-slate-400 hover:text-slate-600 mb-2 inline-block"
          >
            {t('backToDashboard')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{child.name}</h1>
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
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          {t('profileInfo')}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('name')}</label>
              <p className="text-sm text-slate-900">{child.name}</p>
            </div>
            <div>
              <label className="label">{t('gender')}</label>
              <p className="text-sm text-slate-900 capitalize">
                {child.gender || t('notSpecified')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('dateOfBirth')}</label>
              <p className="text-sm text-slate-900">
                {new Date(child.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="label">{t('age')}</label>
              <p className="text-sm text-slate-900">
                {calculateAge(child.dateOfBirth)}
              </p>
            </div>
          </div>

          <div>
            <label className="label">{t('ageBand')}</label>
            <p className="text-sm text-slate-900">
              {child.ageBand || t('notDetermined')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('totalObservations')}</label>
              <p className="text-sm text-slate-900">
                {child.observationCount || 0}
              </p>
            </div>
            <div>
              <label className="label">{t('milestoneProgress')}</label>
              <p className="text-sm text-slate-900">
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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
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
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-700 mb-4">
          {t('dangerZone')}
        </h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary border-red-300 text-red-700 hover:bg-red-50 w-full"
          >
            {t('deleteProfile')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">
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
