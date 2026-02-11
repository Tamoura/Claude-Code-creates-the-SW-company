'use client';

import { useTranslations } from 'next-intl';
import Header from '../../components/layout/Header';

export default function PrivacyPage() {
  const t = useTranslations('privacy');
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
            {t('title')}
          </h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p>
              <strong>{t('lastUpdated')}</strong> {t('lastUpdatedDate')}
            </p>

            <p>
              {t('intro')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              {t('commitmentsTitle')}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('commitment1')}</li>
              <li>{t('commitment2')}</li>
              <li>{t('commitment3')}</li>
              <li>{t('commitment4')}</li>
              <li>{t('commitment5')}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              {t('dataCollectedTitle')}
            </h2>
            <p>
              {t('dataCollectedText')}
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8">
              {t('retentionTitle')}
            </h2>
            <p>
              {t('retentionText')}
            </p>

            <p className="text-sm text-slate-400 mt-12">
              {t('fullPolicyNote')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
