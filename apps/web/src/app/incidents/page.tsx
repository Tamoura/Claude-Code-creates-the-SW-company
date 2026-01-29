'use client';

import { useIncidents } from '@/hooks/use-incidents';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function IncidentsPage() {
  const { data, isLoading, error } = useIncidents({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading incidents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error loading incidents: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-2 text-gray-600">
            Manage and track service incidents
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            Total Incidents: <span className="font-semibold text-gray-900">{data?.pagination.total || 0}</span>
          </div>
        </div>

        {/* Incidents Table */}
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
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {incident.displayId}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{incident.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        incident.status === 'NEW'
                          ? 'bg-blue-100 text-blue-800'
                          : incident.status === 'IN_PROGRESS'
                          ? 'bg-yellow-100 text-yellow-800'
                          : incident.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {incident.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        incident.priority === 'P1'
                          ? 'bg-red-100 text-red-800'
                          : incident.priority === 'P2'
                          ? 'bg-orange-100 text-orange-800'
                          : incident.priority === 'P3'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {incident.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {incident.reportedBy
                      ? `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`
                      : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(incident.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No incidents found
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {data.data.length} of {data.pagination.total} incidents
          </div>
        )}
      </div>
    </div>
  );
}
