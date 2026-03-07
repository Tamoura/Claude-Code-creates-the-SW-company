'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { AssessmentQuestion } from '@/types/index';

export default function AssessmentSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load questions on mount
  useEffect(() => {
    let mounted = true;
    const loadQuestions = async () => {
      try {
        const data = await api.get<{ questions: AssessmentQuestion[] }>(
          `/assessments/${sessionId}/questions`,
        );
        if (mounted) {
          setQuestions(data.questions);
        }
      } catch {
        if (mounted) {
          setError('Unable to load assessment questions. Please try again.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void loadQuestions();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent =
    totalQuestions > 0
      ? Math.round((Object.keys(answers).length / totalQuestions) * 100)
      : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;

  const handleAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    },
    [currentQuestion],
  );

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || !currentAnswer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(`/assessments/${sessionId}/respond`, {
        questionId: currentQuestion.id,
        answer: currentAnswer,
      });
    } catch {
      setError('Unable to save your answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, currentQuestion, currentAnswer]);

  const handleNext = useCallback(async () => {
    await submitAnswer();
    if (error) return; // Don't advance if submit failed
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [submitAnswer, error, isLastQuestion]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleComplete = useCallback(async () => {
    await submitAnswer();
    setIsCompleting(true);
    setError(null);
    try {
      await api.post(`/assessments/${sessionId}/complete`);
      void router.push(`/assessment/${sessionId}/complete`);
    } catch {
      setError('Unable to complete assessment. Please try again.');
      setIsCompleting(false);
    }
  }, [submitAnswer, sessionId, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-2 w-full rounded-full bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  // Error state (no questions loaded)
  if (!isLoading && questions.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="mb-4 text-gray-600">
            {error ?? 'No questions found for this assessment.'}
          </p>
          <Link
            href="/assessment"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Return to assessments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>{t('assessment.in_progress')}</span>
            <span
              aria-label={`Progress: ${currentIndex + 1} of ${totalQuestions} questions`}
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

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700"
          >
            {error}
          </div>
        )}

        <Card padding="lg">
          {currentQuestion && (
            <>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                {currentQuestion.dimension} &bull; Question{' '}
                {currentIndex + 1} of {totalQuestions}
              </div>

              <h1 className="mb-6 text-xl font-semibold text-gray-900">
                {currentQuestion.text}
              </h1>

              {currentQuestion.type === 'SCENARIO' &&
                currentQuestion.options &&
                currentQuestion.options.length > 0 && (
                  <fieldset>
                    <legend className="sr-only">Select your answer</legend>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option) => (
                        <label
                          key={option.key}
                          className={[
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                            currentAnswer === option.key
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50',
                          ].join(' ')}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={option.key}
                            checked={currentAnswer === option.key}
                            onChange={() => handleAnswer(option.key)}
                            className="mt-0.5 h-4 w-4 accent-brand-600"
                          />
                          <span className="text-sm text-gray-700">
                            {option.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

              {currentQuestion.type === 'SELF_REPORT' && (
                <fieldset>
                  <legend className="sr-only">
                    Rate on a scale of 1 to 5
                  </legend>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 shrink-0">
                      Strongly Disagree
                    </span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const strValue = String(value);
                        const isSelected = currentAnswer === strValue;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleAnswer(strValue)}
                            aria-pressed={isSelected}
                            className={[
                              'flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-semibold transition-colors',
                              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                              isSelected
                                ? 'border-brand-500 bg-brand-600 text-white'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50',
                            ].join(' ')}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      Strongly Agree
                    </span>
                  </div>
                </fieldset>
              )}

              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || isSubmitting}
                >
                  {t('common.back')}
                </Button>

                {isLastQuestion ? (
                  <Button
                    type="button"
                    onClick={handleComplete}
                    loading={isCompleting || isSubmitting}
                    disabled={!currentAnswer}
                  >
                    Complete Assessment
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    loading={isSubmitting}
                    disabled={!currentAnswer}
                  >
                    {t('common.next')}
                  </Button>
                )}
              </div>
            </>
          )}
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
