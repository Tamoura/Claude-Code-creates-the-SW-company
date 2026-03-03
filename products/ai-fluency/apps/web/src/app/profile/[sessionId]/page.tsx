import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Assessment Result',
};

interface Props {
  params: Promise<{ sessionId: string }>;
}

const dimensionResults = [
  { name: 'Conceptual', score: 74 },
  { name: 'Practical', score: 68 },
  { name: 'Critical Thinking', score: 81 },
  { name: 'Collaborative', score: 72 },
];

export default async function SessionResultPage({ params }: Props) {
  const { sessionId } = await params;
  const overallScore = Math.round(
    dimensionResults.reduce((sum, d) => sum + d.score, 0) /
      dimensionResults.length,
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-2">
            <Link
              href="/profile"
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              &larr; Back to Profile
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Assessment Result
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            Session: {sessionId}
          </p>

          <Card padding="lg" className="mb-6 text-center">
            <div className="text-sm font-medium text-gray-500 mb-1">
              Overall Score
            </div>
            <div className="text-6xl font-bold text-brand-600 mb-1">
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">out of 100</div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Dimension Breakdown
            </h2>
            <div className="space-y-4">
              {dimensionResults.map((dim) => (
                <div key={dim.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{dim.name}</span>
                    <span className="text-brand-600 font-semibold">
                      {dim.score}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                    role="progressbar"
                    aria-valuenow={dim.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${dim.name} score: ${dim.score} out of 100`}
                  >
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-6 flex gap-4">
            <Link
              href="/learning"
              className="inline-flex min-h-[48px] items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              View Recommended Paths
            </Link>
            <Link
              href="/assessment"
              className="inline-flex min-h-[48px] items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              Retake Assessment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
