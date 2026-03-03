import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Organization Dashboard',
};

const metrics = [
  { label: 'Total Learners', value: '—', description: 'Enrolled members' },
  { label: 'Avg. Fluency Score', value: '—', description: 'Across all dimensions' },
  { label: 'Assessments Completed', value: '—', description: 'Last 30 days' },
  { label: 'Active Learning Paths', value: '—', description: 'Currently in progress' },
];

export default function OrgDashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('org.dashboard.title')}
          </h1>
          <p className="mb-8 text-gray-600">
            Monitor your organisation&apos;s AI fluency metrics and team progress.
          </p>

          {/* Metrics grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} padding="md">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {metric.label}
                </div>
                <div className="text-3xl font-bold text-brand-600 mb-1">
                  {metric.value}
                </div>
                <div className="text-xs text-gray-400">{metric.description}</div>
              </Card>
            ))}
          </div>

          {/* Dimension breakdown */}
          <Card padding="lg" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Organisation Fluency Breakdown
            </h2>
            <div className="space-y-4">
              {['Conceptual', 'Practical', 'Critical Thinking', 'Collaborative'].map(
                (dim) => (
                  <div key={dim}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{dim}</span>
                      <span className="text-gray-400">No data yet</span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-valuenow={0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${dim}: no data`}
                    >
                      <div className="h-full rounded-full bg-gray-200" style={{ width: '0%' }} />
                    </div>
                  </div>
                ),
              )}
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Data will appear after your team members complete assessments.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
