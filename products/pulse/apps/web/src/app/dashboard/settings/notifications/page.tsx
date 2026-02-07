'use client';

import { useState } from 'react';

interface NotificationPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultPrefs: NotificationPref[] = [
  {
    id: 'pr-merged',
    label: 'PR Merged',
    description: 'Notify when a pull request is merged',
    enabled: true,
  },
  {
    id: 'review-requested',
    label: 'Review Requested',
    description: 'Notify when you are requested to review',
    enabled: true,
  },
  {
    id: 'deployments',
    label: 'Deployments',
    description: 'Notify on deployment events',
    enabled: false,
  },
  {
    id: 'risk-alerts',
    label: 'Risk Alerts',
    description: 'Notify when sprint risk level changes',
    enabled: true,
  },
];

type DigestFrequency = 'daily' | 'weekly' | 'never';

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPref[]>(defaultPrefs);
  const [digest, setDigest] = useState<DigestFrequency>('daily');

  function togglePref(id: string) {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Notification Preferences
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure notification categories and quiet hours
          </p>
        </div>
        <a
          href="/dashboard/settings"
          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
        >
          Back to Settings
        </a>
      </div>

      {/* Push Notifications */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Push Notifications
        </h2>
        <div className="space-y-4">
          {prefs.map((pref) => (
            <div key={pref.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {pref.label}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {pref.description}
                </div>
              </div>
              <button
                role="switch"
                aria-checked={pref.enabled}
                onClick={() => togglePref(pref.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pref.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pref.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Email Digest */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Email Digest
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Receive a summary of team activity via email
        </p>
        <div className="flex items-center gap-2">
          {(['daily', 'weekly', 'never'] as DigestFrequency[]).map((freq) => (
            <button
              key={freq}
              onClick={() => setDigest(freq)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                digest === freq
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[var(--bg-page)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:bg-[var(--bg-sidebar-hover)]'
              }`}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
