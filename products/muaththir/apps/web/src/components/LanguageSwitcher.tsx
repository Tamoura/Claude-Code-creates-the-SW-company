'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { setLocale } from '../i18n/actions';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = locale === 'en' ? 'ar' : 'en';
    startTransition(() => {
      setLocale(next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      {locale === 'en' ? 'عربي' : 'English'}
    </button>
  );
}
