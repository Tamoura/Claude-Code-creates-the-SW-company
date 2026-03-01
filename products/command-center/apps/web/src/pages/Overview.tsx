import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  message: string;
  product: string | null;
  timestamp: string;
}

interface ProductHealth {
  name: string;
  phase: string;
  hasApi: boolean;
  hasCi: boolean;
  qualityScore: number | null;
}

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
    avgQualityScore: number | null;
    openAlerts: number;
  };
  phaseBreakdown: Record<string, number>;
  activeAlerts: Alert[];
  recentCommits: Array<{ shortHash: string; author: string; date: string; message: string }>;
  productHealthMatrix: ProductHealth[];
}

function severityDot(severity: Alert['severity']): string {
  if (severity === 'critical') return 'bg-red-500';
  if (severity === 'warning') return 'bg-amber-500';
  return 'bg-blue-500';
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-amber-400';
  return 'text-red-400';
}

export default function Overview() {
  const { data, loading } = useApi<OverviewData>('/overview');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load overview</p>;

  const { stats, phaseBreakdown, activeAlerts = [], recentCommits = [], productHealthMatrix = [] } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Company Command Center</h1>
      <p className="text-gray-500 mb-8">ConnectSW AI Software Company — live operations dashboard</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products" value={stats.totalProducts} sublabel={`${stats.productsWithCi} with CI`} color="blue" />
        <StatCard label="AI Agents" value={stats.totalAgents} sublabel="Specialist roles" color="green" />
        <StatCard
          label="Avg Quality Score"
          value={stats.avgQualityScore !== null ? stats.avgQualityScore : '—'}
          sublabel="out of 10"
          color="purple"
        />
        <StatCard
          label="Open Alerts"
          value={stats.openAlerts}
          sublabel="active notifications"
          color={stats.openAlerts > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Phase Distribution + Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Phase Distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Phase Distribution</h2>
          <div className="space-y-3">
            {Object.entries(phaseBreakdown).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={phase === 'Production' ? 'success' : phase === 'MVP' ? 'info' : 'warning'}>
                    {phase}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(count / stats.totalProducts) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-16 text-right">
                    {count} product{count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">All clear — no active alerts</span>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${severityDot(alert.severity)} mt-1.5 flex-shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-300 truncate">{alert.message}</p>
                    <p className="text-xs text-gray-600">
                      {alert.product && <span className="text-gray-500">{alert.product} · </span>}
                      {alert.source}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Product Health Matrix */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Product Health Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phase</th>
                <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">API</th>
                <th className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CI/CD</th>
                <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {productHealthMatrix.map((p) => (
                <tr key={p.name} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 text-gray-200 font-medium">{p.name}</td>
                  <td className="py-2.5">
                    <Badge variant={p.phase === 'Production' ? 'success' : p.phase === 'MVP' ? 'info' : 'warning'}>
                      {p.phase}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-center">
                    {p.hasApi
                      ? <span className="text-emerald-400">✓</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="py-2.5 text-center">
                    {p.hasCi
                      ? <span className="text-emerald-400">✓</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className={`py-2.5 text-right font-semibold ${scoreColor(p.qualityScore)}`}>
                    {p.qualityScore !== null ? `${p.qualityScore}/10` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Commits */}
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
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-64 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="h-48 bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-800 rounded-xl" />
      </div>
      <div className="h-64 bg-gray-800 rounded-xl mb-8" />
      <div className="h-40 bg-gray-800 rounded-xl" />
    </div>
  );
}
