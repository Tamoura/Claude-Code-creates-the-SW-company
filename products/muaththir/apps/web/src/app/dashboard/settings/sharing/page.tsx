'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface FamilyShare {
  id: string;
  email: string;
  role: 'viewer' | 'contributor';
  status: 'pending' | 'accepted';
  invitedAt: string;
}

export default function SharingSettingsPage() {
  const t = useTranslations('sharing');
  const tc = useTranslations('common');

  const [shares, setShares] = useState<FamilyShare[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'contributor'>('viewer');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) return;

    const newShare: FamilyShare = {
      id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      email: trimmed,
      role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };

    setShares((prev) => [...prev, newShare]);
    setEmail('');
    setSuccessMessage(t('inviteSent'));

    // Auto-dismiss success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRemove = (id: string) => {
    setShares((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          {tc('back')}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
      </div>

      {/* Invite Form */}
      <form onSubmit={handleInvite} className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('invite')}
        </h2>

        {successMessage && (
          <div
            className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <div>
          <label htmlFor="invite-email" className="label">
            {t('inviteEmail')}
          </label>
          <input
            id="invite-email"
            type="email"
            className="input-field"
            placeholder={t('invitePlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="invite-role" className="label">
            {t('roleViewer')} / {t('roleContributor')}
          </label>
          <select
            id="invite-role"
            className="input-field"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'viewer' | 'contributor')
            }
          >
            <option value="viewer">{t('roleViewer')}</option>
            <option value="contributor">{t('roleContributor')}</option>
          </select>
        </div>

        <button type="submit" className="btn-primary w-full">
          {t('invite')}
        </button>
      </form>

      {/* Active Shares List */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('title')}
        </h2>

        {shares.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {t('noShares')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('noSharesDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between border border-slate-100 rounded-xl p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {share.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        share.role === 'viewer'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {share.role === 'viewer'
                        ? t('roleViewer')
                        : t('roleContributor')}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        share.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {share.status === 'pending'
                        ? t('pending')
                        : t('accepted')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(share.id)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium ml-4"
                >
                  {t('remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
