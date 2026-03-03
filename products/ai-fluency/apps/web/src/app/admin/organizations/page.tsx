import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Organizations — Admin',
};

export default function AdminOrganizationsPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-3">
            <span
              className="rounded-md bg-danger-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-danger-700"
              aria-label="Admin only"
            >
              Admin
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('admin.organizations.title')}
            </h1>
          </div>
          <p className="mb-8 text-gray-600">
            Manage all organisations registered on the AI Fluency platform.
          </p>

          {/* Search and filters */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="org-search" className="sr-only">
                Search organisations
              </label>
              <input
                id="org-search"
                type="search"
                placeholder="Search organisations..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] transition-colors"
            >
              + Add Organisation
            </button>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      Organisation
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      Domain
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      Learners
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      Avg. Score
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-gray-700">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-gray-400"
                    >
                      No organisations found. Add your first organisation to get started.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
