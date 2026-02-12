'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
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
  );
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default function SubscriptionSettingsPage() {
  const t = useTranslations('subscription');
  const tc = useTranslations('common');
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSubscribe = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 5000);
  };

  const comparisonRows = [
    {
      feature: t('featureChildProfiles'),
      free: t('featureChildProfilesFree'),
      premium: t('featureChildProfilesPremium'),
    },
    {
      feature: t('featureObservations'),
      free: t('featureObservationsValue'),
      premium: t('featureObservationsValue'),
    },
    {
      feature: t('featureDimensions'),
      free: 'check',
      premium: 'check',
    },
    {
      feature: t('featureMilestones'),
      free: 'check',
      premium: 'check',
    },
    {
      feature: t('featureRadar'),
      free: 'check',
      premium: 'check',
    },
    {
      feature: t('featureTimeline'),
      free: 'check',
      premium: 'check',
    },
    {
      feature: t('featureAiInsights'),
      free: 'x',
      premium: 'check',
    },
    {
      feature: t('featureExport'),
      free: 'x',
      premium: 'check',
    },
    {
      feature: t('featurePrioritySupport'),
      free: 'x',
      premium: 'check',
    },
    {
      feature: t('featureEarlyAccess'),
      free: 'x',
      premium: 'check',
    },
  ];

  const renderCellValue = (value: string) => {
    if (value === 'check') {
      return <CheckIcon className="text-emerald-500 dark:text-emerald-400 mx-auto" />;
    }
    if (value === 'x') {
      return <XIcon className="text-slate-300 dark:text-slate-600 mx-auto" />;
    }
    return (
      <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
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

      {/* Coming Soon Toast */}
      {showComingSoon && (
        <div
          className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('comingSoonTitle')}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {t('comingSoonMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Banner */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('currentPlan')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('freeDesc')}
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full uppercase tracking-wide">
            {t('free')}
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Card */}
        <div className="card border-2 border-slate-200 dark:border-slate-600 relative">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('monthlyPlan')}
          </h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('monthlyPrice')}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('monthlyPeriod')}
            </span>
          </div>
          <ul className="mt-6 space-y-3">
            {[
              t('premiumFeature1'),
              t('premiumFeature2'),
              t('premiumFeature3'),
              t('premiumFeature4'),
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <CheckIcon className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSubscribe}
            className="btn-secondary w-full mt-6"
          >
            {t('subscribe')}
          </button>
        </div>

        {/* Annual Card */}
        <div className="card border-2 border-emerald-500 dark:border-emerald-400 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
              {t('bestValue')}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('annualPlan')}
          </h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('annualPrice')}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('annualPeriod')}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              {t('annualSavings')}
            </span>
          </div>
          <ul className="mt-6 space-y-3">
            {[
              t('premiumFeature1'),
              t('premiumFeature2'),
              t('premiumFeature3'),
              t('premiumFeature4'),
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <CheckIcon className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={handleSubscribe}
            className="btn-primary w-full mt-6"
          >
            {t('subscribe')}
          </button>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="card overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('featureComparison')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {t('featureHeader')}
                </th>
                <th className="pb-3 text-sm font-semibold text-slate-900 dark:text-white text-center w-24">
                  {t('freeHeader')}
                </th>
                <th className="pb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center w-24">
                  {t('premiumHeader')}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <td className="py-3 text-sm text-slate-700 dark:text-slate-300">
                    {row.feature}
                  </td>
                  <td className="py-3 text-center">
                    {renderCellValue(row.free)}
                  </td>
                  <td className="py-3 text-center">
                    {renderCellValue(row.premium)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
