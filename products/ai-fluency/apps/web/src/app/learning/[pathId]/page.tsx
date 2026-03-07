'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
interface DisplayModule {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  completedAt?: string;
}

interface DisplayPath {
  title: string;
  description: string;
}

interface PathData {
  path: DisplayPath;
  modules: DisplayModule[];
}

interface Props {
  params: Promise<{ pathId: string }>;
}

const typeIcons: Record<string, string> = {
  reading: '\u25CE',
  video: '\u25B6',
  exercise: '\u25C8',
  quiz: '\u25C9',
};

const statusColors: Record<string, string> = {
  completed: 'bg-success-50 text-success-700 border-success-200',
  in_progress: 'bg-brand-50 text-brand-700 border-brand-200',
  not_started: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function LearningPathPage({ params }: Props) {
  const { pathId } = use(params);
  const [data, setData] = useState<PathData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPath = async () => {
      try {
        const result = await api.get<PathData>(
          `/learning-paths/${pathId}`,
        );
        if (mounted) setData(result);
      } catch {
        if (mounted) setError('Failed to load learning path.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void fetchPath();
    return () => {
      mounted = false;
    };
  }, [pathId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar />
        <div
          className="flex flex-1 items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            aria-hidden="true"
          />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    // Fallback to static content for paths that don't exist in API yet
    return <FallbackPathView pathId={pathId} error={error} />;
  }

  const { path, modules } = data;
  const completedCount = modules.filter((m) => m.completedAt).length;
  const progressPercent =
    modules.length > 0
      ? Math.round((completedCount / modules.length) * 100)
      : 0;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href="/learning"
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              &larr; Learning Paths
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {path.title}
          </h1>
          <p className="mb-8 text-gray-600">{path.description}</p>

          {/* Progress */}
          <Card padding="md" className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Your Progress</span>
              <span>
                {completedCount} of {modules.length} completed
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Learning path progress: ${progressPercent}%`}
            >
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Card>

          {/* Module list */}
          <div className="space-y-3">
            {modules.map((mod, index) => {
              const status = mod.completedAt
                ? 'completed'
                : index === completedCount
                  ? 'in_progress'
                  : 'not_started';
              return (
                <div
                  key={mod.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 ${statusColors[status]}`}
                >
                  <div
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      mod.completedAt
                        ? 'bg-success-100 text-success-700'
                        : 'bg-gray-100 text-gray-400',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {mod.completedAt ? '\u2713' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span aria-hidden="true" className="text-sm">
                        {typeIcons[mod.type] ?? '\u25CB'}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-800">
                        {mod.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      {mod.type} &bull; {mod.durationMinutes} min
                      {mod.completedAt && (
                        <span className="ml-2 text-success-600">
                          Completed{' '}
                          {new Date(mod.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/learning/${pathId}/modules/${mod.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] flex items-center transition-colors"
                  >
                    {mod.completedAt ? 'Review' : 'Start'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fallback when API path doesn't exist yet */
function FallbackPathView({
  pathId,
  error,
}: {
  pathId: string;
  error: string | null;
}) {
  const fallbackModules = [
    { id: 'intro', title: 'Introduction', type: 'reading', duration: 20 },
    { id: 'concepts', title: 'Core Concepts', type: 'video', duration: 35 },
    { id: 'practice', title: 'Hands-on Practice', type: 'exercise', duration: 25 },
    { id: 'assessment', title: 'Knowledge Check', type: 'quiz', duration: 10 },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href="/learning"
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              &larr; Learning Paths
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900 capitalize">
            {pathId.replace(/-/g, ' ')}
          </h1>
          <p className="mb-8 text-gray-600">
            Work through the modules below at your own pace.
          </p>

          {error && (
            <Card padding="md" className="mb-6 border-warning-300 bg-warning-50">
              <p className="text-sm text-warning-700">
                Unable to load from API. Showing default modules.
              </p>
            </Card>
          )}

          <Card padding="md" className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Your Progress</span>
              <span>0 of {fallbackModules.length} completed</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Learning path progress: 0%"
            >
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: '0%' }}
              />
            </div>
          </Card>

          <div className="space-y-3">
            {fallbackModules.map((mod, index) => (
              <div
                key={mod.id}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400"
                  aria-hidden="true"
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span aria-hidden="true" className="text-sm">
                      {typeIcons[mod.type]}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {mod.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    {mod.type} &bull; {mod.duration} min
                  </p>
                </div>
                <Link
                  href={`/learning/${pathId}/modules/${mod.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] flex items-center transition-colors"
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
