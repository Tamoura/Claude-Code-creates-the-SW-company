'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { riskService } from '@/services/risk.service';
import type { Risk, RiskFilters, RiskStatus } from '@/types/risk';
import {
  getRiskScoreColor,
  getRiskLevel,
  getStatusColor,
  RISK_STATUSES,
  RISK_CATEGORIES,
} from '@/types/risk';

export default function RisksPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter state
  const [filters, setFilters] = useState<RiskFilters>({
    page: 1,
    limit: 20,
    sort: 'riskScore',
    order: 'desc',
  });

  // Fetch risks
  useEffect(() => {
    const fetchRisks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await riskService.getRisks(filters);
        setRisks(response.risks);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch (err: any) {
        console.error('Error fetching risks:', err);
        setError(err.message || 'Failed to load risks');
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof RiskFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value, // Reset to page 1 when filters change
    }));
  };

  // Handle sort change
  const handleSort = (column: 'title' | 'riskScore' | 'created' | 'updated') => {
    setFilters((prev) => ({
      ...prev,
      sort: column,
      order: prev.sort === column && prev.order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  // Navigate to risk detail
  const handleRiskClick = (riskId: string) => {
    router.push(`/risks/${riskId}`);
  };

  // Navigate to create risk
  const handleCreateRisk = () => {
    router.push('/risks/new');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Register</h1>
          <p className="text-gray-600 mt-1">Manage and track organizational risks</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Register</h1>
          <p className="text-gray-600 mt-1">Manage and track organizational risks</p>
        </div>
        <button
          onClick={handleCreateRisk}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Risk
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                handleFilterChange('status', e.target.value || undefined)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {RISK_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) =>
                handleFilterChange('category', e.target.value || undefined)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {RISK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Min Score Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
            <select
              value={filters.minScore || ''}
              onChange={(e) =>
                handleFilterChange(
                  'minScore',
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="1">1</option>
              <option value="6">6 (Medium)</option>
              <option value="15">15 (High)</option>
            </select>
          </div>

          {/* Max Score Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
            <select
              value={filters.maxScore || ''}
              onChange={(e) =>
                handleFilterChange(
                  'maxScore',
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="5">5 (Low)</option>
              <option value="14">14</option>
              <option value="25">25</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.status || filters.category || filters.minScore || filters.maxScore) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 20,
                  sort: 'riskScore',
                  order: 'desc',
                });
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Showing {risks.length} of {total} risks
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading risks...</p>
          </div>
        ) : risks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No risks found</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first risk.
            </p>
            <button
              onClick={handleCreateRisk}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Risk
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Risk Title</span>
                        {filters.sort === 'title' && (
                          <span>{filters.order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('riskScore')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Risk Score</span>
                        {filters.sort === 'riskScore' && (
                          <span>{filters.order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L × I
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('updated')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Updated</span>
                        {filters.sort === 'updated' && (
                          <span>{filters.order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {risks.map((risk) => (
                    <tr
                      key={risk.id}
                      onClick={() => handleRiskClick(risk.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {risk.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{risk.category}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskScoreColor(
                            risk.riskScore
                          )}`}
                        >
                          {risk.riskScore} - {getRiskLevel(risk.riskScore)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {risk.likelihood} × {risk.impact}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            risk.status
                          )}`}
                        >
                          {risk.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {risk.owner?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(risk.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {filters.page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', (filters.page || 1) - 1)}
                    disabled={(filters.page || 1) === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                    disabled={(filters.page || 1) >= totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
