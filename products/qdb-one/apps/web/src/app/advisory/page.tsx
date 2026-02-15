'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProgramsByOrg, getSessionsByOrg, getAssessmentsByOrg } from '@/data/advisory';

export default function AdvisoryPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const programs = getProgramsByOrg(activeOrg.orgId);
  const sessions = getSessionsByOrg(activeOrg.orgId);
  const assessments = getAssessmentsByOrg(activeOrg.orgId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Advisory Portal', 'بوابة الاستشارات')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t('Programs, sessions, and assessments', 'البرامج والجلسات والتقييمات')}
        </p>
      </div>

      {/* Programs Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('Active Programs', 'البرامج النشطة')}</h2>
        </div>
        <div className="p-5 space-y-4">
          {programs.length === 0 ? (
            <div className="text-center text-sm text-[var(--muted)] py-4">
              {t('No programs found', 'لا توجد برامج')}
            </div>
          ) : (
            programs.map((program) => (
              <Link
                key={program.id}
                href={`/advisory/programs/${program.id}`}
                className="block p-4 border border-[var(--border)] rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {t(program.nameEn, program.nameAr)}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{program.description}</div>
                  </div>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)]"
                  >
                    {program.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--success)] rounded-full transition-all"
                      style={{ width: `${program.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--muted)]">{program.progress}%</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Sessions Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('Advisory Sessions', 'الجلسات الاستشارية')}</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              {t('No sessions found', 'لا توجد جلسات')}
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/advisory/sessions/${session.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--foreground)]">{session.topic}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {session.advisorName} · {session.date} {session.time}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'completed'
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : session.status === 'scheduled'
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'bg-[var(--muted)]/10 text-[var(--muted)]'
                  }`}
                >
                  {session.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Assessments Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('Assessments', 'التقييمات')}</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {assessments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              {t('No assessments found', 'لا توجد تقييمات')}
            </div>
          ) : (
            assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/advisory/assessments/${assessment.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--foreground)]">{assessment.type}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{formatDate(assessment.date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-[var(--foreground)]">{assessment.overallScore}</div>
                    <div className="text-xs text-[var(--muted)]">{t('Score', 'النتيجة')}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
