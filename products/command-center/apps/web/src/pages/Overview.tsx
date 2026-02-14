import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface OverviewData {
  company: string;
  stats: {
    totalProducts: number;
    totalPackages: number;
    totalAgents: number;
    totalFiles: number;
    productsWithApi: number;
    productsWithWeb: number;
    productsWithCi: number;
  };
  phaseBreakdown: Record<string, number>;
  recentAudit: Array<{ timestamp: string; type: string; summary?: string; product?: string; agent?: string }>;
  recentCommits: Array<{ shortHash: string; author: string; date: string; message: string }>;
}

export default function Overview() {
  const { data, loading } = useApi<OverviewData>('/overview');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load overview</p>;

  const { stats, phaseBreakdown, recentAudit, recentCommits } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Executive Overview</h1>
      <p className="text-gray-500 mb-8">ConnectSW company health at a glance</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products" value={stats.totalProducts} sublabel={`${stats.productsWithCi} with CI`} color="blue" />
        <StatCard label="Shared Packages" value={stats.totalPackages} sublabel="Reusable modules" color="purple" />
        <StatCard label="AI Agents" value={stats.totalAgents} sublabel="Specialist roles" color="green" />
        <StatCard label="Total Files" value={stats.totalFiles.toLocaleString()} sublabel="Across all products" color="orange" />
      </div>

      {/* Phase breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Product Phases</h2>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(phaseBreakdown).map(([phase, count]) => (
            <div key={phase} className="flex items-center gap-2">
              <Badge variant={phase === 'Production' ? 'success' : phase === 'MVP' ? 'info' : 'warning'}>
                {phase}
              </Badge>
              <span className="text-gray-400 text-sm">{count} product{count > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Recent Activity + Recent Commits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentAudit.length === 0 && <p className="text-gray-500 text-sm">No recent activity</p>}
            {recentAudit.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-300">{entry.summary ?? entry.type}</p>
                  <p className="text-xs text-gray-600">
                    {entry.product && <span className="text-gray-500">{entry.product}</span>}
                    {entry.agent && <span className="text-gray-600"> by {entry.agent}</span>}
                    {' '}{new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Commits</h2>
          <div className="space-y-3">
            {recentCommits.length === 0 && <p className="text-gray-500 text-sm">No recent commits</p>}
            {recentCommits.map((commit, i) => (
              <div key={i} className="flex items-start gap-3">
                <code className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                  {commit.shortHash}
                </code>
                <div>
                  <p className="text-sm text-gray-300">{commit.message}</p>
                  <p className="text-xs text-gray-600">{commit.author} &middot; {new Date(commit.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
