'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { ScenarioOptions } from './ScenarioOptions';
import { LikertOptions } from './LikertOptions';
import type {
  Question,
  AssessmentSession,
  AssessmentResponse,
  ScenarioOption,
  LikertScale,
} from '@/types/index';

interface SessionData {
  session: AssessmentSession;
  questions: Question[];
  responses: AssessmentResponse[];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function AssessmentSessionPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      try {
        const result = await api.get<SessionData>(
          `/assessment-sessions/${id}`,
        );
        if (!mounted) return;
        setData(result);
        // Populate existing answers
        const existing: Record<string, string> = {};
        for (const r of result.responses) {
          existing[r.questionId] = r.answer;
        }
        setAnswers(existing);
        // Resume from first unanswered question
        const firstUnanswered = result.questions.findIndex(
          (q) => !existing[q.id],
        );
        if (firstUnanswered >= 0) {
          setCurrentIndex(firstUnanswered);
        }
      } catch {
        if (mounted) setError('Failed to load assessment session.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchSession();
    return () => {
      mounted = false;
    };
  }, [id]);

  const currentQuestion = data?.questions[currentIndex] ?? null;
  const totalQuestions = data?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const saveResponse = useCallback(
    async (questionId: string, answer: string) => {
      setIsSaving(true);
      try {
        await api.post(`/assessment-sessions/${id}/responses`, {
          questionId,
          answer,
        });
      } catch {
        // Silently fail — answer is still stored locally
      } finally {
        setIsSaving(false);
      }
    },
    [id],
  );

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
      void saveResponse(currentQuestion.id, answer);
    },
    [currentQuestion, saveResponse],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      await api.post(`/assessment-sessions/${id}/complete`);
      router.push(`/assessment/${id}/complete`);
    } catch {
      setError('Failed to complete assessment. Please try again.');
      setIsCompleting(false);
    }
  }, [id, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-64px)] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data || !currentQuestion) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <Card padding="lg" className="max-w-md text-center">
          <p className="mb-4 text-gray-700" role="alert">
            {error ?? 'Assessment session not found.'}
          </p>
          <Link
            href="/assessment"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Return to assessments
          </Link>
        </Card>
      </div>
    );
  }

  const dimensionLabel =
    currentQuestion.dimension.charAt(0) +
    currentQuestion.dimension.slice(1).toLowerCase();
  const currentAnswer = answers[currentQuestion.id] ?? null;
  const isScenario = currentQuestion.questionType === 'SCENARIO';

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{t('assessment.in_progress')}</span>
            <span
              aria-label={`Progress: ${answeredCount} of ${totalQuestions} questions answered`}
            >
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Assessment progress"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <Card padding="lg">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            {dimensionLabel} &bull; Question {currentIndex + 1} of{' '}
            {totalQuestions}
          </div>

          <h1 className="mb-6 text-xl font-semibold text-gray-900">
            {currentQuestion.text}
          </h1>

          {isScenario ? (
            <ScenarioOptions
              questionId={currentQuestion.id}
              options={currentQuestion.optionsJson as ScenarioOption[]}
              selectedAnswer={currentAnswer}
              onSelect={handleAnswer}
            />
          ) : (
            <LikertOptions
              questionId={currentQuestion.id}
              scale={currentQuestion.optionsJson as LikertScale}
              selectedAnswer={currentAnswer}
              onSelect={handleAnswer}
            />
          )}

          <div className="mt-6 flex justify-between">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              aria-label="Go to previous question"
            >
              {t('common.back')}
            </Button>

            {isLastQuestion ? (
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={isCompleting}
                disabled={answeredCount < totalQuestions}
                aria-label="Complete the assessment"
              >
                Complete Assessment
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!currentAnswer}
                loading={isSaving}
                aria-label="Go to next question"
              >
                {t('common.next')}
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link
            href="/assessment"
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
          >
            Save and exit
          </Link>
        </div>
      </div>
    </div>
  );
}
