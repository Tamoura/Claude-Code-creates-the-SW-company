'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('muaththir-theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Fall back to system preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  function handleToggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('muaththir-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('muaththir-theme', 'light');
    }
  }

  // Avoid hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        aria-label={t('darkMode')}
      >
        <span className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
      aria-label={isDark ? t('lightMode') : t('darkMode')}
    >
      {isDark ? (
        /* Sun icon - shown in dark mode to switch to light */
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
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        /* Moon icon - shown in light mode to switch to dark */
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
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
