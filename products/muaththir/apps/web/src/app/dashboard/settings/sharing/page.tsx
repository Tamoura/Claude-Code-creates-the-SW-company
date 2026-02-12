'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { apiClient, type FamilyShare } from '../../../../lib/api-client';

export default function SharingSettingsPage() {
  const t = useTranslations('sharing');
  const tc = useTranslations('common');

  const [shares, setShares] = useState<FamilyShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'contributor'>('viewer');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    try {
      const data = await apiClient.getShares();
      setShares(data);
    } catch {
      setErrorMessage(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const newShare = await apiClient.inviteShare({ email: trimmed, role });
      setShares((prev) => [newShare, ...prev]);
      setEmail('');
      setSuccessMessage(t('inviteSent'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('errorInvite'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await apiClient.revokeShare(id);
      setShares((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setErrorMessage(t('errorRemove'));
    } finally {
      setRemovingId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending') return t('pending');
    if (status === 'accepted') return t('accepted');
    if (status === 'declined') return t('declined');
    return status;
  };

  const getStatusClasses = (status: string) => {
    if (status === 'accepted') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (status === 'declined') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('description')}</p>
      </div>

      {/* Invite Form */}
      <form onSubmit={handleInvite} className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('invite')}
        </h2>

        {successMessage && (
          <div
            className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            {successMessage}
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
            disabled={submitting}
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
            disabled={submitting}
          >
            <option value="viewer">{t('roleViewer')}</option>
            <option value="contributor">{t('roleContributor')}</option>
          </select>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t('sending') : t('invite')}
        </button>
      </form>

      {/* Active Shares List */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('title')}
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{tc('loading')}</p>
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-slate-400 dark:text-slate-500"
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
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('noShares')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('noSharesDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between border border-slate-100 dark:border-slate-700 rounded-xl p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {share.inviteeEmail}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        share.role === 'viewer'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}
                    >
                      {share.role === 'viewer'
                        ? t('roleViewer')
                        : t('roleContributor')}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusClasses(share.status)}`}
                    >
                      {getStatusLabel(share.status)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(share.id)}
                  disabled={removingId === share.id}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium ms-4 disabled:opacity-50"
                >
                  {removingId === share.id ? t('removing') : t('remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
