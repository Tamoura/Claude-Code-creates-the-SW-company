import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Learning Paths',
};

const samplePaths = [
  {
    id: 'ai-foundations',
    title: 'AI Foundations',
    description: 'Core concepts of artificial intelligence, machine learning, and modern AI systems.',
    estimatedHours: 8,
    moduleCount: 6,
    level: 'Beginner',
  },
  {
    id: 'prompt-engineering',
    title: 'Effective Prompt Engineering',
    description: 'Learn to craft precise, effective prompts to get the best results from LLMs.',
    estimatedHours: 4,
    moduleCount: 4,
    level: 'Intermediate',
  },
  {
    id: 'ai-critical-thinking',
    title: 'Critical AI Evaluation',
    description: 'Develop the skills to evaluate, fact-check, and critically analyse AI outputs.',
    estimatedHours: 6,
    moduleCount: 5,
    level: 'Intermediate',
  },
];

const levelColors: Record<string, string> = {
  Beginner: 'bg-success-50 text-success-700',
  Intermediate: 'bg-warning-50 text-warning-700',
  Advanced: 'bg-danger-50 text-danger-700',
};

export default function LearningPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('learning.title')}
          </h1>
          <p className="mb-8 text-gray-600">{t('learning.description')}</p>

          <div className="grid gap-4">
            {samplePaths.map((path) => (
              <Card key={path.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {path.title}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${levelColors[path.level]}`}
                      >
                        {path.level}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">
                      {path.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{path.moduleCount} modules</span>
                      <span aria-hidden="true">&bull;</span>
                      <span>{path.estimatedHours} hours</span>
                    </div>
                  </div>
                  <Link
                    href={`/learning/${path.id}`}
                    className="shrink-0 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors min-h-[48px] flex items-center"
                  >
                    Start Path
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
