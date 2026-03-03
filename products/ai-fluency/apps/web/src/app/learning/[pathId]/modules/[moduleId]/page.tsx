import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Module',
};

interface Props {
  params: Promise<{ pathId: string; moduleId: string }>;
}

export default async function ModulePage({ params }: Props) {
  const { pathId, moduleId } = await params;
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href={`/learning/${pathId}`}
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              &larr; Back to Path
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900 capitalize">
            {moduleId.replace(/-/g, ' ')}
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            Path: <span className="capitalize">{pathId.replace(/-/g, ' ')}</span>
          </p>

          <Card padding="lg" className="mb-6">
            <article>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Module Content
              </h2>
              <div className="prose prose-sm text-gray-600 max-w-none">
                <p className="mb-3">
                  This module covers foundational concepts that are essential for developing AI fluency.
                  The content is tailored based on your fluency profile and learning goals.
                </p>
                <p className="mb-3">
                  Work through each section carefully and use the provided exercises to reinforce
                  your understanding. At the end, you&apos;ll complete a short knowledge check.
                </p>
                <p>
                  Module content is loaded dynamically from the AI Fluency content library.
                  Full content will be available after completing your initial assessment.
                </p>
              </div>
            </article>
          </Card>

          <div className="flex justify-between">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] transition-colors"
            >
              Mark Complete &amp; Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
