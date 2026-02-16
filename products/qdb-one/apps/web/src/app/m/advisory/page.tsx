'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProgramsByOrg, getSessionsByOrg, getAssessmentsByOrg } from '@/data/advisory';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileAdvisoryPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const programs = getProgramsByOrg(activeOrg.orgId);
  const sessions = getSessionsByOrg(activeOrg.orgId);
  const assessments = getAssessmentsByOrg(activeOrg.orgId);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <MobileHeader title={t('Advisory', '\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A')} />
      <div className="px-4 py-4 space-y-4">
        {/* Programs */}
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          {t('Programs', '\u0627\u0644\u0628\u0631\u0627\u0645\u062C')}
        </h2>
        {programs.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">{t('No programs', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u0631\u0627\u0645\u062C')}</p>
        ) : (
          programs.map(program => (
            <MobileCard key={program.id} href={`/m/advisory/programs/${program.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-[var(--foreground)]">{t(program.nameEn, program.nameAr)}</div>
                <MobileStatusBadge status={program.status} />
              </div>
              <div className="text-xs text-[var(--muted)] line-clamp-1 mb-2">{program.description}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${program.progress}%` }} />
                </div>
                <span className="text-xs font-medium text-[var(--muted)]">{program.progress}%</span>
              </div>
            </MobileCard>
          ))
        )}

        {/* Sessions */}
        <h2 className="text-sm font-semibold text-[var(--foreground)] pt-2">
          {t('Sessions', '\u0627\u0644\u062C\u0644\u0633\u0627\u062A')}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">{t('No sessions', '\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0644\u0633\u0627\u062A')}</p>
        ) : (
          sessions.map(session => (
            <MobileCard key={session.id} href={`/m/advisory/sessions/${session.id}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="text-sm font-medium text-[var(--foreground)]">{session.topic}</div>
                <MobileStatusBadge status={session.status} />
              </div>
              <div className="text-xs text-[var(--muted)]">
                {session.advisorName} · {session.date} {session.time}
              </div>
            </MobileCard>
          ))
        )}

        {/* Assessments */}
        <h2 className="text-sm font-semibold text-[var(--foreground)] pt-2">
          {t('Assessments', '\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A')}
        </h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">{t('No assessments', '\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0642\u064A\u064A\u0645\u0627\u062A')}</p>
        ) : (
          assessments.map(assessment => (
            <MobileCard key={assessment.id} href={`/m/advisory/assessments/${assessment.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{assessment.type}</div>
                  <div className="text-xs text-[var(--muted)]">{formatDate(assessment.date)}</div>
                </div>
                <div className="text-xl font-bold text-[var(--foreground)]">{assessment.overallScore}</div>
              </div>
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}
