import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Teams',
};

export default function TeamsPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('org.teams.title')}
              </h1>
              <p className="mt-1 text-gray-600">
                Manage teams and track group fluency progress.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] transition-colors"
            >
              + Create Team
            </button>
          </div>

          <div className="empty-state">
            <div className="text-5xl" aria-hidden="true">◉</div>
            <h2 className="empty-state-title">No teams yet</h2>
            <p className="empty-state-description">
              Create your first team to start tracking group AI fluency metrics.
            </p>
            <button
              type="button"
              className="inline-flex min-h-[48px] items-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              Create Your First Team
            </button>
          </div>

          {/* Table skeleton for future use */}
          <div className="mt-8 hidden">
            <Card padding="none">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-600">Team</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-600">Members</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-600">Avg. Score</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody />
              </table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
