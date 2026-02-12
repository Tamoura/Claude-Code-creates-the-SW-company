'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../../lib/api-client';

function StepIndicator({ currentStep }: { currentStep: number }) {
  const t = useTranslations('onboardingChild');

  const steps = [
    { label: t('stepCreateAccount'), step: 1 },
    { label: t('stepAddChild'), step: 2 },
    { label: t('stepStartTracking'), step: 3 },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {steps.map((s, index) => (
          <div key={s.step} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  s.step < currentStep
                    ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400'
                    : s.step === currentStep
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {s.step < currentStep ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  s.step <= currentStep
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 sm:w-20 -mt-6 ${
                  s.step < currentStep
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingChildPage() {
  const router = useRouter();
  const t = useTranslations('onboardingChild');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

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

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);

    try {
      await apiClient.demoLogin();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demoError'));
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-lg">
        {/* Step Indicator */}
        <StepIndicator currentStep={2} />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div
              className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400"
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
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
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
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500'
                  }`}
                  aria-pressed={gender === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Health & Medical Section (collapsible) */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={() => setShowHealth(!showHealth)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={showHealth}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('healthMedical')}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t('optional')}</span>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${
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
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
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
            disabled={!name.trim() || !dateOfBirth || isLoading || isDemoLoading}
          >
            {isLoading ? t('creatingProfile') : t('createProfile')}
          </button>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-800 px-3 text-slate-400 dark:text-slate-500">
                {t('orSeparator')}
              </span>
            </div>
          </div>

          {/* Demo Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading || isDemoLoading}
            className="btn-secondary w-full"
          >
            {isDemoLoading ? t('demoLoading') : t('tryDemoData')}
          </button>
        </form>
      </div>
    </div>
  );
}
