'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, type Child } from '../../../../lib/api-client';

interface ChildProfilePageProps {
  params: { id: string };
}

export default function ChildProfilePage({ params }: ChildProfilePageProps) {
  const router = useRouter();
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
        <p className="text-sm text-red-700">{error || 'Child not found'}</p>
        <Link
          href="/dashboard"
          className="text-sm text-emerald-600 hover:text-emerald-700 mt-4 inline-block"
        >
          Back to Dashboard
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
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{child.name}</h1>
        </div>
        <Link
          href={`/dashboard/child/${child.id}/edit`}
          className="btn-secondary"
        >
          Edit Profile
        </Link>
      </div>

      {/* Profile Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Profile Information
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <p className="text-sm text-slate-900">{child.name}</p>
            </div>
            <div>
              <label className="label">Gender</label>
              <p className="text-sm text-slate-900 capitalize">
                {child.gender || 'Not specified'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <p className="text-sm text-slate-900">
                {new Date(child.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="label">Age</label>
              <p className="text-sm text-slate-900">
                {calculateAge(child.dateOfBirth)}
              </p>
            </div>
          </div>

          <div>
            <label className="label">Age Band</label>
            <p className="text-sm text-slate-900">
              {child.ageBand || 'Not determined'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Total Observations</label>
              <p className="text-sm text-slate-900">
                {child.observationCount || 0}
              </p>
            </div>
            <div>
              <label className="label">Milestone Progress</label>
              <p className="text-sm text-slate-900">
                {child.milestoneProgress
                  ? `${child.milestoneProgress.achieved} / ${child.milestoneProgress.total}`
                  : 'No data'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Quick Actions
        </h2>
        <div className="space-y-3">
          <Link
            href={`/dashboard/observe?childId=${child.id}`}
            className="btn-primary w-full"
          >
            Log New Observation
          </Link>
          <Link
            href="/dashboard/milestones"
            className="btn-secondary w-full"
          >
            View Milestones
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-700 mb-4">
          Danger Zone
        </h2>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary border-red-300 text-red-700 hover:bg-red-50 w-full"
          >
            Delete Child Profile
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">
              Are you sure? This will permanently delete {child.name}&apos;s profile and all
              associated observations and milestone data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
