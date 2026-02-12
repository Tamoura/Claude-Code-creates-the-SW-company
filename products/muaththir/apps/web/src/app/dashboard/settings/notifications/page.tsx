'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface NotificationPrefs {
  dailyReminder: boolean;
  weeklyDigest: boolean;
  milestoneAlerts: boolean;
}

const STORAGE_KEY = 'muaththir-notification-prefs';

const defaultPrefs: NotificationPrefs = {
  dailyReminder: false,
  weeklyDigest: false,
  milestoneAlerts: false,
};

function loadPrefsFromStorage(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw);
    return {
      dailyReminder: Boolean(parsed.dailyReminder),
      weeklyDigest: Boolean(parsed.weeklyDigest),
      milestoneAlerts: Boolean(parsed.milestoneAlerts),
    };
  } catch {
    return defaultPrefs;
  }
}

function savePrefsToStorage(prefs: NotificationPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function NotificationsSettingsPage() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');

  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefsFromStorage());
  }, []);

  const toggle = useCallback(
    (key: keyof NotificationPrefs) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      savePrefsToStorage(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    },
    [prefs]
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
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
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
    </div>
  );
}
