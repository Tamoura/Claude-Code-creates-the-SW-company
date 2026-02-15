'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { advisorySessions, getProgramById } from '@/data/advisory';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileSessionDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();
  const [isCancelled, setIsCancelled] = useState(false);

  if (!user) return null;

  const session = advisorySessions.find(s => s.id === params.id);
  if (!session) {
    return (
      <div>
        <MobileHeader title={t('Session', '\u0627\u0644\u062C\u0644\u0633\u0629')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Session not found', '\u0627\u0644\u062C\u0644\u0633\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629')}
        </div>
      </div>
    );
  }

  const program = getProgramById(session.programId);
  const actualStatus = isCancelled ? 'cancelled' : session.status;

  const handleCancel = () => {
    if (confirm(t('Cancel this session?', '\u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629\u061F'))) {
      setIsCancelled(true);
    }
  };

  return (
    <div>
      <MobileHeader title={session.topic} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <MobileCard>
          <div className="flex items-start justify-between mb-2">
            <div className="text-base font-bold flex-1 mr-2">{session.topic}</div>
            <MobileStatusBadge status={actualStatus} />
          </div>
        </MobileCard>

        {/* Details */}
        <MobileCard>
          <h2 className="text-sm font-semibold mb-3">{t('Details', '\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644')}</h2>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Advisor', '\u0627\u0644\u0645\u0633\u062A\u0634\u0627\u0631')}</div>
              <div className="text-sm font-medium">{session.advisorName}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Date', '\u0627\u0644\u062A\u0627\u0631\u064A\u062E')}</div>
              <div className="text-sm font-medium">
                {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Time', '\u0627\u0644\u0648\u0642\u062A')}</div>
              <div className="text-sm font-medium">{session.time}</div>
            </div>
            {program && (
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Program', '\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C')}</div>
                <Link href={`/m/advisory/programs/${program.id}`} className="text-sm font-medium text-[var(--primary)]">
                  {t(program.nameEn, program.nameAr)}
                </Link>
              </div>
            )}
          </div>
        </MobileCard>

        {/* Materials */}
        {session.materials && session.materials.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Materials', '\u0627\u0644\u0645\u0648\u0627\u062F')}</h2>
            {session.materials.map((material, i) => (
              <MobileCard key={i} className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--primary)]">{'\u{1F4C4}'}</span>
                  <span className="text-sm font-medium">{material}</span>
                </div>
              </MobileCard>
            ))}
          </div>
        )}

        {/* Notes */}
        <MobileCard>
          <h2 className="text-sm font-semibold mb-2">{t('Notes', '\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A')}</h2>
          {session.notes ? (
            <p className="text-xs text-[var(--foreground)] leading-relaxed">{session.notes}</p>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              {t('Notes available after session.', '\u0633\u062A\u062A\u0648\u0641\u0631 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0628\u0639\u062F \u0627\u0644\u062C\u0644\u0633\u0629.')}
            </p>
          )}
        </MobileCard>

        {/* Cancel button */}
        {actualStatus === 'scheduled' && !isCancelled && (
          <button
            onClick={handleCancel}
            className="w-full py-3 bg-[var(--danger)] text-white rounded-xl text-sm font-medium"
          >
            {t('Cancel Session', '\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629')}
          </button>
        )}

        {isCancelled && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {t('This session has been cancelled.', '\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.')}
          </div>
        )}
      </div>
    </div>
  );
}
