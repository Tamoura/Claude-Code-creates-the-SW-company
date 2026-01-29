'use client';

import { useChanges } from '@/hooks/use-changes';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ChangesPage() {
  const { data, isLoading, error } = useChanges({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading changes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error loading changes: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Changes</h1>
              <p className="mt-2 text-gray-600">
                Manage and track change requests
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/incidents"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                View Incidents
              </Link>
              <Link
                href="/problems"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                View Problems
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            Total Changes: <span className="font-semibold text-gray-900">{data?.pagination.total || 0}</span>
          </div>
        </div>

        {/* Changes Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/changes/${change.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {change.displayId}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{change.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        change.status === 'DRAFT'
                          ? 'bg-gray-100 text-gray-800'
                          : change.status === 'SUBMITTED'
                          ? 'bg-blue-100 text-blue-800'
                          : change.status === 'PENDING_APPROVAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : change.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : change.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : change.status === 'SCHEDULED'
                          ? 'bg-purple-100 text-purple-800'
                          : change.status === 'IMPLEMENTING'
                          ? 'bg-indigo-100 text-indigo-800'
                          : change.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : change.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {change.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        change.type === 'EMERGENCY'
                          ? 'bg-red-100 text-red-800'
                          : change.type === 'NORMAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {change.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        change.priority === 'P1'
                          ? 'bg-red-100 text-red-800'
                          : change.priority === 'P2'
                          ? 'bg-orange-100 text-orange-800'
                          : change.priority === 'P3'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {change.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        change.risk === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : change.risk === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {change.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {change.scheduledStartAt ? formatDate(change.scheduledStartAt) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(change.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No changes found. Changes are created to manage infrastructure and application modifications.
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {data.data.length} of {data.pagination.total} changes
          </div>
        )}
      </div>
    </div>
  );
}
