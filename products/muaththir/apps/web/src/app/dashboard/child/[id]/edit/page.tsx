'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, type Child } from '../../../../../lib/api-client';

interface EditChildProfilePageProps {
  params: { id: string };
}

export default function EditChildProfilePage({ params }: EditChildProfilePageProps) {
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  useEffect(() => {
    const loadChild = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getChild(params.id);
        setChild(data);

        // Pre-fill form
        setName(data.name);
        setDateOfBirth(data.dateOfBirth.split('T')[0]); // Convert to YYYY-MM-DD
        setGender(data.gender || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load child');
      } finally {
        setLoading(false);
      }
    };

    loadChild();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!child) return;

    try {
      setSaving(true);
      setError(null);

      await apiClient.updateChild(child.id, {
        name,
        dateOfBirth,
        gender: gender || null,
      });

      router.push(`/dashboard/child/${child.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update child');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  if (error && !child) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-sm text-red-700">{error}</p>
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
      <div>
        <Link
          href={`/dashboard/child/${params.id}`}
          className="text-sm text-slate-400 hover:text-slate-600 mb-2 inline-block"
        >
          Back to Profile
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Child Profile</h1>
      </div>

      {/* Edit Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Child's name"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="label">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="input-field"
              required
              disabled={saving}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="gender" className="label">
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
              className="input-field"
              disabled={saving}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !name || !dateOfBirth}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/dashboard/child/${params.id}`}
              className="btn-secondary flex-1 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
