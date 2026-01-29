'use client';

import { useServiceRequests } from '@/hooks/use-service-requests';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ServiceRequestsPage() {
  const { data, isLoading, error } = useServiceRequests({ page: 1, limit: 20 });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading service requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          Error loading service requests: {(error as Error).message}
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
              <p className="mt-2 text-gray-600">
                Request standard services from the catalog
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/incidents"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Incidents
              </Link>
              <Link
                href="/problems"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Problems
              </Link>
              <Link
                href="/changes"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Changes
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            Total Requests:{' '}
            <span className="font-semibold text-gray-900">
              {data?.pagination.total || 0}
            </span>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fulfiller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/service-requests/${request.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {request.displayId}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {request.catalogItem?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === 'SUBMITTED'
                          ? 'bg-blue-100 text-blue-800'
                          : request.status === 'PENDING_APPROVAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : request.status === 'FULFILLING'
                          ? 'bg-purple-100 text-purple-800'
                          : request.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.priority === 'P1'
                          ? 'bg-red-100 text-red-800'
                          : request.priority === 'P2'
                          ? 'bg-orange-100 text-orange-800'
                          : request.priority === 'P3'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.requester?.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.fulfiller?.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No service requests found. Request services from the catalog.
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {data && data.pagination.total > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {data.data.length} of {data.pagination.total} requests
          </div>
        )}
      </div>
    </div>
  );
}
