'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../../lib/api-client';

export default function OnboardingChildPage() {
  const router = useRouter();
  const t = useTranslations('onboardingChild');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Health fields
  const [showHealth, setShowHealth] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const allergies = allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await apiClient.createChild({
        name,
        dateOfBirth,
        gender: gender ? (gender as 'male' | 'female') : undefined,
        medicalNotes: medicalNotes || undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        specialNeeds: specialNeeds || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create child profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="child-name" className="label">
              {t('childName')}
            </label>
            <input
              id="child-name"
              type="text"
              required
              className="input-field"
              placeholder={t('childNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="date-of-birth" className="label">
              {t('dateOfBirth')}
            </label>
            <input
              id="date-of-birth"
              type="date"
              required
              className="input-field"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="mt-1 text-xs text-slate-400">
              {t('dateOfBirthHint')}
            </p>
          </div>

          <fieldset>
            <legend className="label mb-2">{t('genderOptional')}</legend>
            <div className="flex gap-3">
              {[
                { label: t('boy'), value: 'male' },
                { label: t('girl'), value: 'female' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    gender === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                  aria-pressed={gender === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

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
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!name.trim() || !dateOfBirth || isLoading}
          >
            {isLoading ? t('creatingProfile') : t('createProfile')}
          </button>
        </form>
      </div>
    </div>
  );
}
