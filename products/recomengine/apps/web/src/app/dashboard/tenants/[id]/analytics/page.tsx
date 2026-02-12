'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../../lib/api-client';
import StatCard from '../../../../../components/dashboard/StatCard';

interface Overview {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  period: { from: string; to: string };
}

interface TimeseriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, timeseriesRes] = await Promise.all([
        api.get<{ data: Overview }>(`/api/v1/tenants/${tenantId}/analytics/overview?period=${period}`),
        api.get<{ data: TimeseriesPoint[] }>(`/api/v1/tenants/${tenantId}/analytics/timeseries?period=${period}`),
      ]);
      setOverview(overviewRes.data);
      setTimeseries(timeseriesRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [tenantId, period]);

  const handleExport = async () => {
    try {
      const csv = await api.get<string>(`/api/v1/tenants/${tenantId}/analytics/export?period=${period}`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {}
  };

  if (loading) return <div className="text-gray-500">Loading analytics...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Impressions" value={(overview?.impressions || 0).toLocaleString()} />
        <StatCard title="Clicks" value={(overview?.clicks || 0).toLocaleString()} />
        <StatCard title="CTR" value={`${((overview?.ctr || 0) * 100).toFixed(2)}%`} />
        <StatCard title="Conversions" value={(overview?.conversions || 0).toLocaleString()} />
        <StatCard
          title="Revenue"
          value={`$${(overview?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Simple table chart (Recharts would be used in production) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="font-semibold mb-4">Daily Performance</h3>
        {timeseries.length === 0 ? (
          <p className="text-gray-500 text-sm">No data for this period. Start sending events to see analytics.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-gray-500">Date</th>
                  <th className="px-4 py-2 text-right text-gray-500">Impressions</th>
                  <th className="px-4 py-2 text-right text-gray-500">Clicks</th>
                  <th className="px-4 py-2 text-right text-gray-500">Conversions</th>
                  <th className="px-4 py-2 text-right text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {timeseries.map(point => (
                  <tr key={point.date} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2">{point.date}</td>
                    <td className="px-4 py-2 text-right">{point.impressions.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{point.clicks.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{point.conversions.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${point.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
