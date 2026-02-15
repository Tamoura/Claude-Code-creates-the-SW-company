'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { assessments, getProgramById } from '@/data/advisory';
import Link from 'next/link';
import { FileText, TrendingUp } from 'lucide-react';

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const assessment = assessments.find(a => a.id === params.id);
  if (!assessment) {
    return (
      <div className="p-8">
        <p className="text-[var(--muted)]">{t('Assessment not found', 'التقييم غير موجود')}</p>
        <Link href="/advisory" className="text-[var(--primary)] hover:underline mt-4 inline-block">
          {t('← Back to Advisory', '→ العودة للاستشارات')}
        </Link>
      </div>
    );
  }

  const program = getProgramById(assessment.programId);

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return 'bg-[var(--success)]';
    if (percentage >= 50) return 'bg-[var(--warning)]';
    return 'bg-[var(--danger)]';
  };

  const getOverallScoreColor = (score: number) => {
    if (score >= 75) return 'text-[var(--success)]';
    if (score >= 50) return 'text-[var(--warning)]';
    return 'text-[var(--danger)]';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        href="/advisory"
        className="text-[var(--primary)] hover:underline mb-6 inline-block"
      >
        {t('← Back to Advisory', '→ العودة للاستشارات')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">
          {assessment.type}
        </h1>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">
              {new Date(assessment.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          {program && (
            <div>
              <Link
                href={`/advisory/programs/${program.id}`}
                className="text-[var(--primary)] hover:underline"
              >
                {t(program.nameEn, program.nameAr)}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 mb-8 text-center">
        <h2 className="text-lg text-[var(--muted)] mb-4">
          {t('Overall Score', 'النتيجة الإجمالية')}
        </h2>
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gray-100">
          <span className={`text-5xl font-bold ${getOverallScoreColor(assessment.overallScore)}`}>
            {assessment.overallScore}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mt-4">
          {t('out of 100', 'من 100')}
        </p>
      </div>

      {/* Category Scores */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Category Scores', 'نتائج الفئات')}
        </h2>
        <div className="space-y-6">
          {assessment.categories.map((category, index) => {
            const percentage = (category.score / category.maxScore) * 100;
            const barColor = getScoreColor(category.score, category.maxScore);

            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-[var(--foreground)]">{category.name}</h3>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {category.score}/{category.maxScore}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {t('Recommendations', 'التوصيات')}
          </h2>
        </div>
        <div className="space-y-4">
          {assessment.recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-[var(--primary-light)] rounded-lg border border-[var(--border)]"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-[var(--primary)] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {index + 1}
              </div>
              <p className="text-[var(--foreground)] leading-relaxed flex-1 pt-1">
                {recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
