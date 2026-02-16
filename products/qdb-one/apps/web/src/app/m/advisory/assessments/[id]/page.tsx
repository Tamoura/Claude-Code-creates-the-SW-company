'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { assessments, getProgramById } from '@/data/advisory';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileAssessmentDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const assessment = assessments.find(a => a.id === params.id);
  if (!assessment) {
    return (
      <div>
        <MobileHeader title={t('Assessment', '\u0627\u0644\u062A\u0642\u064A\u064A\u0645')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Assessment not found', '\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const program = getProgramById(assessment.programId);

  const getScoreColor = (score: number, maxScore: number) => {
    const pct = (score / maxScore) * 100;
    if (pct >= 75) return 'bg-[var(--success)]';
    if (pct >= 50) return 'bg-[var(--warning)]';
    return 'bg-[var(--danger)]';
  };

  const getOverallColor = (score: number) => {
    if (score >= 75) return 'text-[var(--success)]';
    if (score >= 50) return 'text-[var(--warning)]';
    return 'text-[var(--danger)]';
  };

  return (
    <div>
      <MobileHeader title={assessment.type} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <MobileCard>
          <div className="text-base font-bold mb-1">{assessment.type}</div>
          <div className="text-xs text-[var(--muted)]">
            {new Date(assessment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {program && (
              <> · <Link href={`/m/advisory/programs/${program.id}`} className="text-[var(--primary)]">{t(program.nameEn, program.nameAr)}</Link></>
            )}
          </div>
        </MobileCard>

        {/* Overall Score */}
        <MobileCard className="text-center py-6">
          <div className="text-xs text-[var(--muted)] mb-2">{t('Overall Score', '\u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629')}</div>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100">
            <span className={`text-3xl font-bold ${getOverallColor(assessment.overallScore)}`}>{assessment.overallScore}</span>
          </div>
          <p className="text-[10px] text-[var(--muted)] mt-2">{t('out of 100', '\u0645\u0646 100')}</p>
        </MobileCard>

        {/* Category Scores */}
        <MobileCard>
          <h2 className="text-sm font-semibold mb-3">{t('Categories', '\u0627\u0644\u0641\u0626\u0627\u062A')}</h2>
          <div className="space-y-4">
            {assessment.categories.map((cat, i) => {
              const pct = (cat.score / cat.maxScore) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{cat.name}</span>
                    <span className="text-xs font-semibold">{cat.score}/{cat.maxScore}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreColor(cat.score, cat.maxScore)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </MobileCard>

        {/* Recommendations */}
        <div>
          <h2 className="text-sm font-semibold mb-2">{t('Recommendations', '\u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A')}</h2>
          {assessment.recommendations.map((rec, i) => (
            <MobileCard key={i} className="mb-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[var(--primary)] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-xs text-[var(--foreground)] leading-relaxed flex-1">{rec}</p>
              </div>
            </MobileCard>
          ))}
        </div>
      </div>
    </div>
  );
}
