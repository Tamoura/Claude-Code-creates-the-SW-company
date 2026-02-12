'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'muaththir-notification-prefs';

interface NotificationPrefs {
  dailyReminder: boolean;
  weeklyDigest: boolean;
  milestoneAlerts: boolean;
}

const defaultPrefs: NotificationPrefs = {
  dailyReminder: false,
  weeklyDigest: false,
  milestoneAlerts: false,
};

function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}

function savePrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function NotificationsSettingsPage() {
  const t = useTranslations('notifications');

  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const toggle = useCallback(
    (key: keyof NotificationPrefs) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      savePrefs(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    },
    [prefs]
  );

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

      {savedMessage && (
        <div
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 transition-opacity"
          role="status"
        >
          {t('saved')}
        </div>
      )}

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
            role="switch"
            aria-checked={prefs.dailyReminder}
            onClick={() => toggle('dailyReminder')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              prefs.dailyReminder ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
            aria-label="Toggle daily reminder"
          >
            <span
              className={`${
                prefs.dailyReminder ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform`}
            />
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
            role="switch"
            aria-checked={prefs.weeklyDigest}
            onClick={() => toggle('weeklyDigest')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              prefs.weeklyDigest ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
            aria-label="Toggle weekly digest"
          >
            <span
              className={`${
                prefs.weeklyDigest ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform`}
            />
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
            role="switch"
            aria-checked={prefs.milestoneAlerts}
            onClick={() => toggle('milestoneAlerts')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              prefs.milestoneAlerts ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
            aria-label="Toggle milestone alerts"
          >
            <span
              className={`${
                prefs.milestoneAlerts ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
