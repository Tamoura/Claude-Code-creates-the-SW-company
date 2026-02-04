import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { apiClient } from '../lib/api-client';
import type { UsageStats, RecentRequest } from '../lib/api-client';

function DashboardOverview() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageData, requestsData] = await Promise.all([
          apiClient.getUsage(),
          apiClient.getRecentRequests(),
        ]);
        setStats(usageData);
        setRecentRequests(requestsData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of your AI routing activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Requests Today"
          value={stats?.totalRequestsToday.toLocaleString() ?? '0'}
          trend="+12% from yesterday"
        />
        <StatCard
          title="Active Providers"
          value={String(stats?.activeProviders ?? 0)}
          subtitle="Keys configured"
        />
        <StatCard
          title="Free Capacity"
          value={stats?.freeCapacityEstimate ?? '0%'}
          subtitle="Estimated remaining"
        />
        <StatCard
          title="This Month"
          value={stats?.requestsThisMonth.toLocaleString() ?? '0'}
          trend="+8% from last month"
        />
      </div>

      {/* Recent Requests */}
      <div className="bg-card-bg border border-card-border rounded-xl">
        <div className="p-6 border-b border-card-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Recent Requests
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Model
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Provider
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Tokens
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Latency
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-6 py-3">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {recentRequests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 text-sm text-text-primary font-mono">
                    {req.model}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {req.provider}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {req.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {req.latencyMs}ms
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={
                        req.status === 'success' ? 'operational' : 'down'
                      }
                      label={req.status}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {new Date(req.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const isOverview = location.pathname === '/dashboard';

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {isOverview ? <DashboardOverview /> : <Outlet />}
      </main>
    </div>
  );
}
