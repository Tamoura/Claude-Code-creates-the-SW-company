'use client';

import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';
import { OrgFluencyChart } from '@/components/charts/OrgFluencyChart';

const metrics = [
  { label: 'Total Learners', value: '24', description: 'Enrolled members' },
  {
    label: 'Avg. Fluency Score',
    value: '67',
    description: 'Across all dimensions',
  },
  {
    label: 'Assessments Completed',
    value: '18',
    description: 'Last 30 days',
  },
  {
    label: 'Active Learning Paths',
    value: '12',
    description: 'Currently in progress',
  },
];

const DIMENSIONS = [
  { key: 'DELEGATION', label: 'Delegation' },
  { key: 'DESCRIPTION', label: 'Description' },
  { key: 'DISCERNMENT', label: 'Discernment' },
  { key: 'DILIGENCE', label: 'Diligence' },
] as const;

const dimensionScores = {
  DELEGATION: 72,
  DESCRIPTION: 65,
  DISCERNMENT: 58,
  DILIGENCE: 70,
};

const teams = [
  { name: 'Engineering', members: 8, avgScore: 74, assessments: 7 },
  { name: 'Product', members: 5, avgScore: 68, assessments: 4 },
  { name: 'Marketing', members: 6, avgScore: 61, assessments: 5 },
  { name: 'Operations', members: 5, avgScore: 63, assessments: 2 },
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
            Monitor your organisation&apos;s AI fluency metrics and team
            progress.
          </p>

          {/* Metrics grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} padding="md">
                <div className="mb-1 text-sm font-medium text-gray-500">
                  {metric.label}
                </div>
                <div className="mb-1 text-3xl font-bold text-brand-600">
                  {metric.value}
                </div>
                <div className="text-xs text-gray-400">
                  {metric.description}
                </div>
              </Card>
            ))}
          </div>

          {/* Fluency chart */}
          <Card padding="lg" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Organisation Fluency Overview
            </h2>
            <OrgFluencyChart scores={dimensionScores} />
          </Card>

          {/* Dimension breakdown */}
          <Card padding="lg" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Dimension Breakdown
            </h2>
            <div className="space-y-4">
              {DIMENSIONS.map((dim) => {
                const score = dimensionScores[dim.key];
                return (
                  <div key={dim.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {dim.label}
                      </span>
                      <span className="font-semibold text-brand-600">
                        {score}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${dim.label}: ${score} out of 100`}
                    >
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Team breakdown table */}
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Team Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left font-semibold text-gray-700">
                      Team
                    </th>
                    <th className="pb-3 text-right font-semibold text-gray-700">
                      Members
                    </th>
                    <th className="pb-3 text-right font-semibold text-gray-700">
                      Avg. Score
                    </th>
                    <th className="pb-3 text-right font-semibold text-gray-700">
                      Assessments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr
                      key={team.name}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 font-medium text-gray-800">
                        {team.name}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {team.members}
                      </td>
                      <td className="py-3 text-right font-semibold text-brand-600">
                        {team.avgScore}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {team.assessments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Sample data shown. Real data will appear after team members
              complete assessments.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
