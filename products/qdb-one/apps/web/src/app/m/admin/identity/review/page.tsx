'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { matchReviewQueue, approveMatch, rejectMatch } from '@/data/admin';
import type { MatchReviewItem } from '@/data/admin';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileIdentityReviewPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [matches, setMatches] = useState<MatchReviewItem[]>([...matchReviewQueue]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  if (!user) return null;

  const filtered = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  const handleApprove = (id: string) => {
    approveMatch(id);
    setMatches([...matchReviewQueue]);
  };

  const handleReject = (id: string) => {
    rejectMatch(id);
    setMatches([...matchReviewQueue]);
  };

  const confidenceColor = (c: number) => {
    if (c >= 90) return 'var(--success)';
    if (c >= 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const statusCounts = {
    pending: matches.filter(m => m.status === 'pending').length,
    approved: matches.filter(m => m.status === 'approved').length,
    rejected: matches.filter(m => m.status === 'rejected').length,
  };

  return (
    <div>
      <MobileHeader title={t('Identity Review', '\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0647\u0648\u064A\u0629')} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <MobileCard className="text-center py-2">
            <div className="text-lg font-bold text-[var(--warning)]">{statusCounts.pending}</div>
            <div className="text-[10px] text-[var(--muted)]">{t('Pending', '\u0645\u0639\u0644\u0642')}</div>
          </MobileCard>
          <MobileCard className="text-center py-2">
            <div className="text-lg font-bold text-[var(--success)]">{statusCounts.approved}</div>
            <div className="text-[10px] text-[var(--muted)]">{t('Approved', '\u0645\u0648\u0627\u0641\u0642')}</div>
          </MobileCard>
          <MobileCard className="text-center py-2">
            <div className="text-lg font-bold text-[var(--danger)]">{statusCounts.rejected}</div>
            <div className="text-[10px] text-[var(--muted)]">{t('Rejected', '\u0645\u0631\u0641\u0648\u0636')}</div>
          </MobileCard>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                filter === f ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-[var(--muted)]'
              }`}
            >
              {t(f.charAt(0).toUpperCase() + f.slice(1), f === 'all' ? '\u0627\u0644\u0643\u0644' : f === 'pending' ? '\u0645\u0639\u0644\u0642' : f === 'approved' ? '\u0645\u0648\u0627\u0641\u0642' : '\u0645\u0631\u0641\u0648\u0636')}
            </button>
          ))}
        </div>

        {/* Match cards */}
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">{t('No matches', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0637\u0627\u0628\u0642\u0627\u062A')}</p>
        ) : (
          filtered.map(match => (
            <MobileCard key={match.id}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-[var(--muted)]">{match.id}</span>
                <span className="text-xs font-bold" style={{ color: confidenceColor(match.confidence) }}>
                  {match.confidence}%
                </span>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] font-medium text-[var(--muted)] uppercase mb-1">{match.sourceA.system}</div>
                  <div className="text-xs font-medium">{match.sourceA.name}</div>
                  {match.sourceA.email && <div className="text-[10px] text-[var(--muted)]">{match.sourceA.email}</div>}
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] font-medium text-[var(--muted)] uppercase mb-1">{match.sourceB.system}</div>
                  <div className="text-xs font-medium">{match.sourceB.name}</div>
                  {match.sourceB.email && <div className="text-[10px] text-[var(--muted)]">{match.sourceB.email}</div>}
                </div>
              </div>

              {/* Matched fields */}
              <div className="flex flex-wrap gap-1 mb-3">
                {match.matchedFields.map(field => (
                  <span key={field} className="px-2 py-0.5 rounded text-[10px] bg-[var(--primary)]/10 text-[var(--primary)]">{field}</span>
                ))}
              </div>

              {/* Actions */}
              {match.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(match.id)}
                    className="flex-1 py-2 bg-[var(--success)] text-white rounded-lg text-xs font-medium"
                  >
                    {t('Approve', '\u0645\u0648\u0627\u0641\u0642\u0629')}
                  </button>
                  <button
                    onClick={() => handleReject(match.id)}
                    className="flex-1 py-2 bg-[var(--danger)] text-white rounded-lg text-xs font-medium"
                  >
                    {t('Reject', '\u0631\u0641\u0636')}
                  </button>
                </div>
              )}
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}
