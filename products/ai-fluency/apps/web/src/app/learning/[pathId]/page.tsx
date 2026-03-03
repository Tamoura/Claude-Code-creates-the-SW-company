import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Learning Path',
};

interface Props {
  params: Promise<{ pathId: string }>;
}

const modules = [
  { id: 'intro', title: 'Introduction to AI', type: 'reading', duration: 20, completed: false },
  { id: 'ml-basics', title: 'Machine Learning Basics', type: 'video', duration: 35, completed: false },
  { id: 'llm-overview', title: 'Large Language Models Overview', type: 'reading', duration: 25, completed: false },
  { id: 'quiz-1', title: 'Knowledge Check', type: 'quiz', duration: 10, completed: false },
];

const typeIcons: Record<string, string> = {
  reading: '◎',
  video: '▶',
  exercise: '◈',
  quiz: '◉',
};

export default async function LearningPathPage({ params }: Props) {
  const { pathId } = await params;
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

          {/* Progress */}
          <Card padding="md" className="mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Your Progress</span>
              <span>0 of {modules.length} completed</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Learning path progress: 0%"
            >
              <div className="h-full rounded-full bg-brand-500" style={{ width: '0%' }} />
            </div>
          </Card>

          {/* Module list */}
          <div className="space-y-3">
            {modules.map((mod, index) => (
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
                  <div className="flex items-center gap-2 mb-0.5">
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
