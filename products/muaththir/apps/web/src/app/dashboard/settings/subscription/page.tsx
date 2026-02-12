'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function SubscriptionSettingsPage() {
  const t = useTranslations('subscription');
  const tc = useTranslations('common');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          {tc('back')}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('currentPlan')}
          </h2>
          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">
            {t('free')}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t('freeDesc')}
        </p>
        <Link
          href="/pricing"
          className="btn-primary text-sm py-2 px-4"
        >
          {t('upgradeToPremium')}
        </Link>
      </div>

      {/* Premium Benefits */}
      <div className="card border-l-4 border-l-emerald-500 dark:border-l-emerald-600">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          {t('premiumTitle')}
        </h2>
        <ul className="space-y-2">
          {[
            t('benefit1'),
            t('benefit2'),
            t('benefit3'),
            t('benefit4'),
            t('benefit5'),
          ].map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
            >
              <svg
                className="h-4 w-4 text-emerald-500 flex-shrink-0"
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
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
