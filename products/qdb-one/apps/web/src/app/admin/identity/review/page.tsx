'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { matchReviewQueue, approveMatch, rejectMatch } from '@/data/admin';
import type { MatchReviewItem } from '@/data/admin';

export default function IdentityReviewPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [matches, setMatches] = useState<MatchReviewItem[]>([...matchReviewQueue]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  if (!user) return null;

  const filtered = filter === 'all' ? matches : matches.filter((m) => m.status === filter);

  const handleApprove = (id: string) => {
    approveMatch(id);
    setMatches([...matchReviewQueue]);
  };

  const handleReject = (id: string) => {
    rejectMatch(id);
    setMatches([...matchReviewQueue]);
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'var(--success)';
    if (confidence >= 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const statusCounts = {
    pending: matches.filter((m) => m.status === 'pending').length,
    approved: matches.filter((m) => m.status === 'approved').length,
    rejected: matches.filter((m) => m.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Identity Match Review', 'مراجعة مطابقة الهوية')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t(
            'Data Steward queue — review potential entity matches across portals',
            'قائمة مدير البيانات — مراجعة المطابقات المحتملة عبر البوابات'
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--warning)]">{statusCounts.pending}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{t('Pending', 'معلق')}</div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">{statusCounts.approved}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{t('Approved', 'موافق')}</div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--danger)]">{statusCounts.rejected}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{t('Rejected', 'مرفوض')}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-[var(--muted)] hover:bg-gray-200'}`}
          >
            {t(f.charAt(0).toUpperCase() + f.slice(1), f === 'all' ? 'الكل' : f === 'pending' ? 'معلق' : f === 'approved' ? 'موافق' : 'مرفوض')}
          </button>
        ))}
      </div>

      {/* Match Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-12 text-center text-sm text-[var(--muted)]">
            {t('No matches in this category', 'لا توجد مطابقات في هذه الفئة')}
          </div>
        ) : (
          filtered.map((match) => (
            <div key={match.id} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--muted)]">{match.id}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold`}
                    style={{ color: confidenceColor(match.confidence), backgroundColor: `${confidenceColor(match.confidence)}15` }}
                  >
                    {match.confidence}% {t('confidence', 'ثقة')}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${match.status === 'pending' ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                      : match.status === 'approved' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}
                >
                  {match.status}
                </span>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
                <div className="p-5">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                    {match.sourceA.system}
                  </div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{match.sourceA.name}</div>
                  {match.sourceA.email && <div className="text-xs text-[var(--muted)] mt-1">{match.sourceA.email}</div>}
                  {match.sourceA.cr && <div className="text-xs text-[var(--muted)]">CR: {match.sourceA.cr}</div>}
                  {match.sourceA.qid && <div className="text-xs text-[var(--muted)]">QID: {match.sourceA.qid}</div>}
                </div>
                <div className="p-5">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                    {match.sourceB.system}
                  </div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{match.sourceB.name}</div>
                  {match.sourceB.email && <div className="text-xs text-[var(--muted)] mt-1">{match.sourceB.email}</div>}
                  {match.sourceB.cr && <div className="text-xs text-[var(--muted)]">CR: {match.sourceB.cr}</div>}
                  {match.sourceB.qid && <div className="text-xs text-[var(--muted)]">QID: {match.sourceB.qid}</div>}
                </div>
              </div>

              {/* Matched Fields + Actions */}
              <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between bg-gray-50">
                <div className="flex flex-wrap gap-1.5">
                  {match.matchedFields.map((field) => (
                    <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                      {field}
                    </span>
                  ))}
                </div>
                {match.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(match.id)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--success)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      {t('Approve', 'موافقة')}
                    </button>
                    <button
                      onClick={() => handleReject(match.id)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      {t('Reject', 'رفض')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
