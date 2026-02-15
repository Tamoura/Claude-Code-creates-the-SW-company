'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProgramById, getSessionsByProgram, getAssessmentsByProgram } from '@/data/advisory';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileProgramDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const program = getProgramById(params.id as string);
  if (!program) {
    return (
      <div>
        <MobileHeader title={t('Program', '\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Program not found', '\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const sessions = getSessionsByProgram(program.id);
  const assessments = getAssessmentsByProgram(program.id);
  const currentMilestoneIndex = program.milestones.findIndex(m => !m.completed);

  return (
    <div>
      <MobileHeader title={t(program.nameEn, program.nameAr)} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <MobileCard>
          <div className="flex items-start justify-between mb-2">
            <div className="text-base font-bold">{t(program.nameEn, program.nameAr)}</div>
            <MobileStatusBadge status={program.status} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--success)]" style={{ width: `${program.progress}%` }} />
            </div>
            <span className="text-xs font-medium">{program.progress}%</span>
          </div>
          <p className="text-xs text-[var(--muted)]">{program.description}</p>
        </MobileCard>

        {/* Milestones */}
        <div>
          <h2 className="text-sm font-semibold mb-2">{t('Milestones', '\u0627\u0644\u0645\u0631\u0627\u062D\u0644')}</h2>
          <MobileCard>
            <div className="space-y-3">
              {program.milestones.map((milestone, index) => {
                const isCompleted = milestone.completed;
                const isCurrent = index === currentMilestoneIndex;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${
                        isCompleted ? 'bg-[var(--success)]' : isCurrent ? 'bg-[var(--primary)]' : 'bg-gray-300'
                      }`}>
                        {isCompleted ? '\u2713' : index + 1}
                      </div>
                      {index < program.milestones.length - 1 && (
                        <div className={`absolute left-2.5 top-6 w-0.5 h-4 ${isCompleted ? 'bg-[var(--success)]' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isCurrent ? 'text-[var(--primary)]' : isCompleted ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                        {milestone.name}
                      </div>
                      {milestone.date && (
                        <div className="text-[10px] text-[var(--muted)]">{new Date(milestone.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </MobileCard>
        </div>

        {/* Sessions */}
        {sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Sessions', '\u0627\u0644\u062C\u0644\u0633\u0627\u062A')}</h2>
            {sessions.map(session => (
              <MobileCard key={session.id} href={`/m/advisory/sessions/${session.id}`} className="mb-2">
                <div className="flex items-start justify-between mb-1">
                  <div className="text-sm font-medium">{session.topic}</div>
                  <MobileStatusBadge status={session.status} />
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {session.advisorName} \u00B7 {session.date} {session.time}
                </div>
              </MobileCard>
            ))}
          </div>
        )}

        {/* Assessments */}
        {assessments.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Assessments', '\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A')}</h2>
            {assessments.map(assessment => (
              <MobileCard key={assessment.id} href={`/m/advisory/assessments/${assessment.id}`} className="mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{assessment.type}</div>
                    <div className="text-[10px] text-[var(--muted)]">{new Date(assessment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className={`text-xl font-bold ${assessment.overallScore >= 75 ? 'text-[var(--success)]' : assessment.overallScore >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
                    {assessment.overallScore}
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
