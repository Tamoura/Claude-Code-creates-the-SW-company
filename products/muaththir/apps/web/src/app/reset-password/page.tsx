'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';
import { apiClient } from '../../lib/api-client';

function ResetPasswordForm() {
  const t = useTranslations('resetPassword');
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError(t('invalidToken'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }

    if (!token) {
      setError(t('invalidToken'));
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {t('subtitle')}
            </p>
          </div>

          {success ? (
            <div className="card text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {t('passwordUpdated')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {t('passwordUpdatedDesc')}
              </p>
              <Link href="/login" className="btn-primary">
                {t('logIn')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-5">
              {error && (
                <div
                  className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="label">
                  {t('newPassword')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-field"
                  placeholder={t('newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="input-field"
                  placeholder={t('confirmPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? t('resetting') : t('resetPassword')}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
