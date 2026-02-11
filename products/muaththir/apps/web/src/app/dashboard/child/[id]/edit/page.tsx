'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient, type Child } from '../../../../../lib/api-client';

interface EditChildProfilePageProps {
  params: { id: string };
}

export default function EditChildProfilePage({ params }: EditChildProfilePageProps) {
  const router = useRouter();
  const t = useTranslations('editChild');
  const tc = useTranslations('common');
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  // Health fields
  const [showHealth, setShowHealth] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

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

        // Pre-fill health fields
        setMedicalNotes(data.medicalNotes || '');
        setAllergiesText(data.allergies ? data.allergies.join(', ') : '');
        setSpecialNeeds(data.specialNeeds || '');

        // Auto-expand health section if any health data exists
        if (data.medicalNotes || (data.allergies && data.allergies.length > 0) || data.specialNeeds) {
          setShowHealth(true);
        }
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

      const allergies = allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await apiClient.updateChild(child.id, {
        name,
        dateOfBirth,
        gender: gender || null,
        medicalNotes: medicalNotes || null,
        allergies: allergies.length > 0 ? allergies : null,
        specialNeeds: specialNeeds || null,
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
          {t('backToProfile')}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
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
              {t('nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder={t('namePlaceholder')}
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="label">
              {t('dateOfBirth')} <span className="text-red-500">*</span>
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
              {t('gender')}
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
              className="input-field"
              disabled={saving}
            >
              <option value="">{t('preferNotToSay')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
            </select>
          </div>

          {/* Health & Medical Section (collapsible) */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowHealth(!showHealth)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={showHealth}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-700">
                  {t('healthMedical')}
                </span>
                <span className="text-xs text-slate-400">{t('optional')}</span>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showHealth ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showHealth && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="medical-notes" className="label">
                    {t('medicalNotes')}
                  </label>
                  <textarea
                    id="medical-notes"
                    rows={2}
                    className="input-field resize-none"
                    placeholder={t('medicalPlaceholder')}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    maxLength={1000}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label htmlFor="allergies" className="label">
                    {t('allergies')}
                  </label>
                  <input
                    id="allergies"
                    type="text"
                    className="input-field"
                    placeholder={t('allergiesPlaceholder')}
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    disabled={saving}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('allergiesHint')}
                  </p>
                </div>

                <div>
                  <label htmlFor="special-needs" className="label">
                    {t('specialNeeds')}
                  </label>
                  <textarea
                    id="special-needs"
                    rows={2}
                    className="input-field resize-none"
                    placeholder={t('specialNeedsPlaceholder')}
                    value={specialNeeds}
                    onChange={(e) => setSpecialNeeds(e.target.value)}
                    maxLength={1000}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !name || !dateOfBirth}
              className="btn-primary flex-1"
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>
            <Link
              href={`/dashboard/child/${params.id}`}
              className="btn-secondary flex-1 text-center"
            >
              {tc('cancel')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
