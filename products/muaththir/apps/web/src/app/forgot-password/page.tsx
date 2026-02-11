'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';
import { apiClient } from '../../lib/api-client';

export default function ForgotPasswordPage() {
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t('subtitle')}
            </p>
          </div>

          {submitted ? (
            <div className="card text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {t('checkEmail')}
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                {t('checkEmailDesc', { email })}
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
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
                <label htmlFor="email" className="label">
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? t('sending') : t('sendResetLink')}
              </button>

              <p className="text-center text-sm text-slate-500">
                <Link
                  href="/login"
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {t('backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
