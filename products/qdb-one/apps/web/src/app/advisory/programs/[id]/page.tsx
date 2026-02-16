'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProgramById, getSessionsByProgram, getAssessmentsByProgram } from '@/data/advisory';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Circle, Clock } from 'lucide-react';

export default function ProgramDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const program = getProgramById(params.id as string);
  if (!program) {
    return (
      <div className="p-8">
        <p className="text-[var(--muted)]">{t('Program not found', 'البرنامج غير موجود')}</p>
        <Link href="/advisory" className="text-[var(--primary)] hover:underline mt-4 inline-block">
          {t('← Back to Advisory', '→ العودة للاستشارات')}
        </Link>
      </div>
    );
  }

  const sessions = getSessionsByProgram(program.id);
  const assessments = getAssessmentsByProgram(program.id);

  // Find current milestone (first incomplete)
  const currentMilestoneIndex = program.milestones.findIndex(m => !m.completed);

  const statusColors = {
    enrolled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700'
  };

  const statusLabels = {
    enrolled: t('Enrolled', 'مسجل'),
    in_progress: t('In Progress', 'قيد التنفيذ'),
    completed: t('Completed', 'مكتمل')
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back button */}
      <Link
        href="/advisory"
        className="text-[var(--primary)] hover:underline mb-6 inline-block"
      >
        {t('← Back to Advisory', '→ العودة للاستشارات')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {t(program.nameEn, program.nameAr)}
          </h1>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[program.status]}`}>
            {statusLabels[program.status]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--muted)]">{t('Progress', 'التقدم')}</span>
            <span className="font-semibold text-[var(--foreground)]">{program.progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--success)] transition-all duration-300"
              style={{ width: `${program.progress}%` }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-[var(--muted)] leading-relaxed">{program.description}</p>
      </div>

      {/* Milestones Timeline */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Program Milestones', 'مراحل البرنامج')}
        </h2>
        <div className="space-y-4">
          {program.milestones.map((milestone, index) => {
            const isCompleted = milestone.completed;
            const isCurrent = index === currentMilestoneIndex;

            return (
              <div key={index} className="flex items-start gap-4">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-[var(--success)]" />
                  ) : isCurrent ? (
                    <div className="relative">
                      <Circle className="w-6 h-6 text-[var(--primary)]" />
                      <div className="absolute inset-0 animate-ping">
                        <Circle className="w-6 h-6 text-[var(--primary)] opacity-75" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}

                  {/* Connecting line */}
                  {index < program.milestones.length - 1 && (
                    <div
                      className={`absolute left-3 top-8 w-0.5 h-8 ${
                        isCompleted ? 'bg-[var(--success)]' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <h3 className={`font-medium ${
                    isCompleted ? 'text-[var(--foreground)]' :
                    isCurrent ? 'text-[var(--primary)]' :
                    'text-[var(--muted)]'
                  }`}>
                    {milestone.name}
                  </h3>
                  {milestone.date && (
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {t('Completed on', 'اكتمل في')} {new Date(milestone.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Advisory Sessions', 'الجلسات الاستشارية')}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-[var(--muted)]">{t('No sessions scheduled yet', 'لا توجد جلسات مجدولة بعد')}</p>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => {
              const sessionStatusColors = {
                scheduled: 'bg-blue-100 text-blue-700',
                completed: 'bg-green-100 text-green-700',
                cancelled: 'bg-red-100 text-red-700'
              };

              const sessionStatusLabels = {
                scheduled: t('Scheduled', 'مجدولة'),
                completed: t('Completed', 'مكتملة'),
                cancelled: t('Cancelled', 'ملغاة')
              };

              return (
                <Link
                  key={session.id}
                  href={`/advisory/sessions/${session.id}`}
                  className="block p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-medium text-[var(--foreground)]">{session.topic}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${sessionStatusColors[session.status]}`}>
                      {sessionStatusLabels[session.status]}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] mb-1">
                    {t('Advisor:', 'المستشار:')} {session.advisorName}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {new Date(session.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} {t('at', 'في')} {session.time}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Assessments Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Assessments', 'التقييمات')}
        </h2>
        {assessments.length === 0 ? (
          <p className="text-[var(--muted)]">{t('No assessments completed yet', 'لا توجد تقييمات مكتملة بعد')}</p>
        ) : (
          <div className="space-y-4">
            {assessments.map(assessment => {
              const scoreColor = assessment.overallScore >= 75 ? 'text-[var(--success)]' :
                               assessment.overallScore >= 50 ? 'text-[var(--warning)]' :
                               'text-[var(--danger)]';

              return (
                <Link
                  key={assessment.id}
                  href={`/advisory/assessments/${assessment.id}`}
                  className="block p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-medium text-[var(--foreground)]">{assessment.type}</h3>
                    <div className={`text-2xl font-bold ${scoreColor}`}>
                      {assessment.overallScore}%
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {new Date(assessment.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
