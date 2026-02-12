'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { apiClient, type NotificationPrefs } from '../../../../lib/api-client';

const defaultPrefs: NotificationPrefs = {
  dailyReminder: false,
  weeklyDigest: false,
  milestoneAlerts: false,
};

export default function NotificationsSettingsPage() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');

  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadPrefs = useCallback(async () => {
    try {
      const data = await apiClient.getNotificationPrefs();
      setPrefs(data);
    } catch {
      setErrorMessage(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const toggle = useCallback(
    async (key: keyof NotificationPrefs) => {
      setTogglingKey(key);
      setErrorMessage('');
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated); // Optimistic update

      try {
        const result = await apiClient.updateNotificationPrefs({
          [key]: updated[key],
        });
        setPrefs(result);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2000);
      } catch {
        // Revert on error
        setPrefs(prefs);
        setErrorMessage(t('errorSave'));
      } finally {
        setTogglingKey(null);
      }
    },
    [prefs, t]
  );

  const toggleItems: Array<{
    key: keyof NotificationPrefs;
    title: string;
    desc: string;
    label: string;
  }> = [
    {
      key: 'dailyReminder',
      title: t('dailyReminder'),
      desc: t('dailyReminderDesc'),
      label: 'Toggle daily reminder',
    },
    {
      key: 'weeklyDigest',
      title: t('weeklyDigest'),
      desc: t('weeklyDigestDesc'),
      label: 'Toggle weekly digest',
    },
    {
      key: 'milestoneAlerts',
      title: t('milestoneAlerts'),
      desc: t('milestoneAlertsDesc'),
      label: 'Toggle milestone alerts',
    },
  ];

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

      {savedMessage && (
        <div
          className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-700 dark:text-emerald-400 transition-opacity"
          role="status"
        >
          {t('saved')}
        </div>
      )}

      {errorMessage && (
        <div
          className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {tc('loading')}
          </p>
        </div>
      ) : (
        <div className="card space-y-6">
          {toggleItems.map(({ key, title, desc, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                  {title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {desc}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                onClick={() => toggle(key)}
                disabled={togglingKey === key}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                  prefs[key]
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-600'
                }`}
                aria-label={label}
              >
                <span
                  className={`${
                    prefs[key] ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
