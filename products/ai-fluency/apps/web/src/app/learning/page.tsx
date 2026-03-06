'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
import type { LearningPath, FluencyProfile } from '@/types/index';

const levelColors: Record<string, string> = {
  Beginner: 'bg-success-50 text-success-700',
  Intermediate: 'bg-warning-50 text-warning-700',
  Advanced: 'bg-danger-50 text-danger-700',
};

// Fallback paths for when API has no data yet
const defaultPaths = [
  {
    id: 'ai-foundations',
    title: 'AI Foundations',
    description:
      'Core concepts of artificial intelligence, machine learning, and modern AI systems.',
    estimatedHours: 8,
    moduleCount: 6,
    completionPercent: 0,
    level: 'Beginner',
  },
  {
    id: 'prompt-engineering',
    title: 'Effective Prompt Engineering',
    description:
      'Learn to craft precise, effective prompts to get the best results from LLMs.',
    estimatedHours: 4,
    moduleCount: 4,
    completionPercent: 0,
    level: 'Intermediate',
  },
  {
    id: 'ai-critical-thinking',
    title: 'Critical AI Evaluation',
    description:
      'Develop the skills to evaluate, fact-check, and critically analyse AI outputs.',
    estimatedHours: 6,
    moduleCount: 5,
    completionPercent: 0,
    level: 'Intermediate',
  },
];

interface PathWithLevel extends LearningPath {
  level?: string;
}

export default function LearningPage() {
  const [paths, setPaths] = useState<PathWithLevel[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [profileRes, pathsRes] = await Promise.all([
          api
            .get<{ profile: FluencyProfile }>('/profiles/me')
            .catch(() => null),
          api
            .get<{ paths: PathWithLevel[] }>('/learning-paths')
            .catch(() => null),
        ]);
        if (!mounted) return;
        if (profileRes) setHasProfile(true);
        if (pathsRes && pathsRes.paths.length > 0) {
          setPaths(pathsRes.paths);
        } else {
          setPaths(defaultPaths);
        }
      } catch {
        setPaths(defaultPaths);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('learning.title')}
          </h1>
          <p className="mb-8 text-gray-600">{t('learning.description')}</p>

          {!hasProfile && !isLoading && (
            <Card padding="md" className="mb-6 border-brand-200 bg-brand-50">
              <div className="flex items-center gap-3">
                <span className="text-lg text-brand-600" aria-hidden="true">
                  &#9432;
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-800">
                    {t('learning.start_assessment')}
                  </p>
                  <Link
                    href="/assessment"
                    className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Take assessment &rarr;
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {isLoading ? (
            <div
              className="flex justify-center py-12"
              role="status"
              aria-live="polite"
            >
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
                aria-hidden="true"
              />
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          ) : (
            <div className="grid gap-4">
              {paths.map((path) => {
                const level = path.level ?? 'Beginner';
                return (
                  <Card key={path.id} padding="md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {path.title}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${levelColors[level] ?? levelColors.Beginner}`}
                          >
                            {level}
                          </span>
                        </div>
                        <p className="mb-3 text-sm text-gray-600">
                          {path.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{path.moduleCount} modules</span>
                          <span aria-hidden="true">&bull;</span>
                          <span>{path.estimatedHours} hours</span>
                          {path.completionPercent > 0 && (
                            <>
                              <span aria-hidden="true">&bull;</span>
                              <span className="font-medium text-brand-600">
                                {path.completionPercent}% complete
                              </span>
                            </>
                          )}
                        </div>
                        {/* Progress bar */}
                        {path.completionPercent > 0 && (
                          <div
                            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                            role="progressbar"
                            aria-valuenow={path.completionPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${path.title} progress: ${path.completionPercent}%`}
                          >
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{
                                width: `${path.completionPercent}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/learning/${path.id}`}
                        className="shrink-0 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors min-h-[48px] flex items-center"
                      >
                        {path.completionPercent > 0
                          ? 'Continue'
                          : 'Start Path'}
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
