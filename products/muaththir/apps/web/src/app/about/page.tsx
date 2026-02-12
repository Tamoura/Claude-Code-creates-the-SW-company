'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';
import { DIMENSIONS } from '../../lib/dimensions';

export default function AboutPage() {
  const t = useTranslations('about');
  const td = useTranslations('dimensions');
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-8">
            {t('title')}
          </h1>

          <div className="prose prose-slate max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {t('meaningTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('meaningText')}
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {t('dimensionsTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {t('dimensionsSubtitle')}
              </p>
              <div className="space-y-4">
                {DIMENSIONS.map((dim) => (
                  <div
                    key={dim.slug}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: dim.colour }}
                      aria-hidden="true"
                    />
                    <div>
                      <h3
                        className="font-semibold text-slate-900 dark:text-white"
                        style={{ color: dim.colour }}
                      >
                        {td(dim.slug)}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {td(`${dim.slug}Desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {t('philosophyTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {t('philosophyText')}
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    {t('ihsan')}
                  </span>
                  <span>{t('ihsanDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    {t('sabr')}
                  </span>
                  <span>{t('sabrDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    {t('shukr')}
                  </span>
                  <span>{t('shukrDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-semibold mt-0.5">
                    {t('tawakkul')}
                  </span>
                  <span>{t('tawakkulDesc')}</span>
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {t('whoTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('whoText')}
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="btn-primary">
              {t('startTracking')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
