'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LocaleSwitcher } from './locale-switcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export function Header() {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold text-maroon">
            DealGate
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-maroon transition-colors"
            >
              {t('marketplace')}
            </Link>

            {isAuthenticated && user?.role === 'INVESTOR' && (
              <Link
                href="/investor/portfolio"
                className="text-sm font-medium text-gray-700 hover:text-maroon transition-colors"
              >
                {t('portfolio')}
              </Link>
            )}

            {isAuthenticated && user?.role === 'ISSUER' && (
              <Link
                href="/issuer/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-maroon transition-colors"
              >
                {t('dashboard')}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />

          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={logout}>
              {tAuth('signOut')}
            </Button>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">
                  {t('register')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
