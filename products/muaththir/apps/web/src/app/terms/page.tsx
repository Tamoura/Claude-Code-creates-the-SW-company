'use client';

import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';

export default function TermsPage() {
  const t = useTranslations('terms');
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-8">
            {t('title')}
          </h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>{t('lastUpdated')}</strong> {t('lastUpdatedDate')}
            </p>

            <p>
              {t('intro')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">
              {t('serviceTitle')}
            </h2>
            <p>
              {t('serviceText')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">
              {t('accountTitle')}
            </h2>
            <p>
              {t('accountText')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">
              {t('dataTitle')}
            </h2>
            <p>
              {t('dataText')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">
              {t('useTitle')}
            </h2>
            <p>
              {t('useText')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">
              {t('subscriptionTitle')}
            </h2>
            <p>
              {t('subscriptionText')}
            </p>

            <p className="text-sm text-slate-400 dark:text-slate-500 mt-12">
              {t('fullTermsNote')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
