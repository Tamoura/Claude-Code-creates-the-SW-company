'use client';

import { useTranslations } from 'next-intl';

export default function NotificationsSettingsPage() {
  const t = useTranslations('notifications');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              {t('dailyReminder')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dailyReminderDesc')}
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle daily reminder"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              {t('weeklyDigest')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('weeklyDigestDesc')}
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle weekly digest"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">
              {t('milestoneAlerts')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('milestoneAlertsDesc')}
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-200 transition-colors"
            disabled
            aria-label="Toggle milestone alerts"
          >
            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform" />
          </button>
        </div>

        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          {t('comingSoon')}
        </p>
      </div>
    </div>
  );
}
