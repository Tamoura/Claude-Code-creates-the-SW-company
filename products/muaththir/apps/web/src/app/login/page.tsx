'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';

export default function LoginPage() {
  const t = useTranslations('login');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const demoAttempted = useRef(false);

  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    if (!isDemo || demoAttempted.current) return;
    demoAttempted.current = true;

    const performDemoLogin = async () => {
      setIsDemoLoading(true);
      setError('');

      try {
        await apiClient.demoLogin();
        router.push('/dashboard');
      } catch (err) {
        setIsDemoLoading(false);
        setError(
          err instanceof Error ? err.message : tAuth('demoError')
        );
      }
    };

    performDemoLogin();
  }, [isDemo, router, tAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDemoLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="w-full max-w-md text-center">
            <div className="card space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-blue-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">
                {tAuth('demoLoading')}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
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

            <div>
              <label htmlFor="password" className="label">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? t('loggingIn') : t('logIn')}
            </button>

            <p className="text-center text-sm text-slate-500">
              {t('noAccount')}{' '}
              <Link
                href="/signup"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                {t('signUpFree')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
