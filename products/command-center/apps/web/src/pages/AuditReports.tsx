import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';
import StatCard from '../components/StatCard.js';

interface AuditEntry {
  timestamp: string;
  type: string;
  agent?: string;
  product?: string;
  status?: string;
  summary?: string;
  timeMinutes?: number;
}

interface AuditReportResponse {
  total: number;
  entries: AuditEntry[];
  stats: {
    byAgent: Record<string, number>;
    byProduct: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  timeline: Array<{ date: string; count: number }>;
}

function BarChart({ data, color }: { data: [string, number][]; color: string }) {
  const maxCount = Math.max(...data.map(([, count]) => count), 1);

  const barColorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    success: 'bg-emerald-500',
    failure: 'bg-red-500',
    blocked: 'bg-amber-500',
  };

  return (
    <div className="space-y-2">
      {data.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-32 truncate" title={label}>
            {label}
          </span>
          <div className="flex-1 bg-gray-800 rounded-full h-2">
            <div
              className={`${barColorMap[color] || 'bg-blue-500'} rounded-full h-2 transition-all`}
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

function StatusIndicator({ status }: { status?: string }) {
  if (!status) return null;

  const statusLower = status.toLowerCase();
  let color = 'bg-gray-500';

  if (statusLower.includes('success') || statusLower === 'pass') {
    color = 'bg-emerald-500';
  } else if (statusLower.includes('fail') || statusLower === 'error') {
    color = 'bg-red-500';
  } else if (statusLower.includes('block') || statusLower === 'pending') {
    color = 'bg-amber-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500 capitalize">{status}</span>
    </div>
  );
}

export default function AuditReports() {
  const [filters, setFilters] = useState({ agent: '', product: '', status: '' });

  const query = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const { data, loading } = useApi<AuditReportResponse>(`/audit/reports${query ? '?' + query : ''}`);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ agent: '', product: '', status: '' });
  };

  if (loading && !data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-800 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
          <div className="h-24 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-red-400">Failed to load audit reports</p>;

  const successCount = data.stats.byStatus?.success || data.stats.byStatus?.pass || 0;
  const successRate = data.total > 0 ? Math.round((successCount / data.total) * 100) : 0;

  const agentOptions = Object.keys(data.stats.byAgent).sort();
  const productOptions = Object.keys(data.stats.byProduct).sort();
  const statusOptions = Object.keys(data.stats.byStatus).sort();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Audit Reports</h1>
        <p className="text-gray-500">Activity tracking and analytics</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Entries" value={data.total} color="blue" />
        <StatCard
          label="Unique Agents"
          value={Object.keys(data.stats.byAgent).length}
          color="green"
        />
        <StatCard
          label="Products Tracked"
          value={Object.keys(data.stats.byProduct).length}
          color="purple"
        />
        <StatCard label="Success Rate" value={`${successRate}%`} color="orange" />
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Agent</label>
            <select
              value={filters.agent}
              onChange={(e) => handleFilterChange('agent', e.target.value)}
              className="w-full bg-gray-800 border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              {agentOptions.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Product</label>
            <select
              value={filters.product}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              className="w-full bg-gray-800 border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {productOptions.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full bg-gray-800 border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              disabled={!filters.agent && !filters.product && !filters.status}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Audit Entry Timeline (2/3) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
          <div className="space-y-3">
            {data.entries.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No audit entries found</p>
              </div>
            )}

            {data.entries.map((entry, index) => (
              <div
                key={index}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <Badge variant="info">{entry.type}</Badge>
                  </div>
                  <StatusIndicator status={entry.status} />
                </div>

                {entry.summary && (
                  <p className="text-sm text-gray-300 mb-3">{entry.summary}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {entry.agent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                      {entry.agent}
                    </span>
                  )}
                  {entry.product && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                      {entry.product}
                    </span>
                  )}
                  {entry.timeMinutes !== undefined && (
                    <span className="text-xs text-gray-500">
                      {entry.timeMinutes < 1
                        ? '< 1 min'
                        : `${Math.round(entry.timeMinutes)} min`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Breakdown Charts (1/3) */}
        <div className="space-y-6">
          {/* By Agent */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4">By Agent</h3>
            <BarChart
              data={Object.entries(data.stats.byAgent).sort((a, b) => b[1] - a[1])}
              color="blue"
            />
          </div>

          {/* By Product */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4">By Product</h3>
            <BarChart
              data={Object.entries(data.stats.byProduct).sort((a, b) => b[1] - a[1])}
              color="green"
            />
          </div>

          {/* By Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4">By Status</h3>
            <div className="space-y-2">
              {Object.entries(data.stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const statusLower = status.toLowerCase();
                  let color = 'blue';

                  if (statusLower.includes('success') || statusLower === 'pass') {
                    color = 'success';
                  } else if (statusLower.includes('fail') || statusLower === 'error') {
                    color = 'failure';
                  } else if (statusLower.includes('block') || statusLower === 'pending') {
                    color = 'blocked';
                  }

                  return (
                    <BarChart key={status} data={[[status, count]]} color={color} />
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
