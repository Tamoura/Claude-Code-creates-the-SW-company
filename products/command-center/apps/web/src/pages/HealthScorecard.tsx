import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface ProductHealth {
  name: string;
  phase: string;
  hasApi: boolean;
  hasWeb: boolean;
  testCount: number;
  lastCommit: string;
  lastCommitDate: string;
  fileCount: number;
}

interface HealthScorecardResponse {
  products: ProductHealth[];
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="h-64 bg-slate-800 rounded-xl" />
    </div>
  );
}

function phaseVariant(phase: string): 'default' | 'success' | 'warning' | 'info' | 'danger' {
  const p = phase.toLowerCase();
  if (p === 'production') return 'success';
  if (p === 'prototype') return 'info';
  if (p === 'foundation') return 'warning';
  return 'default';
}

function healthIndicator(lastCommitDate: string): { color: string; label: string } {
  if (!lastCommitDate) return { color: 'bg-slate-500', label: 'Unknown' };

  const now = Date.now();
  const commitTime = new Date(lastCommitDate).getTime();
  const daysSince = (now - commitTime) / (1000 * 60 * 60 * 24);

  if (daysSince <= 7) return { color: 'bg-emerald-500', label: 'Active' };
  if (daysSince <= 14) return { color: 'bg-amber-500', label: 'Stale' };
  return { color: 'bg-rose-500', label: 'Inactive' };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateCommit(msg: string, max = 40): string {
  if (!msg) return 'N/A';
  return msg.length > max ? msg.slice(0, max) + '...' : msg;
}

export default function HealthScorecard() {
  const navigate = useNavigate();
  const { data, loading } = useApi<HealthScorecardResponse>('/health-scorecard');

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load health scorecard</p>;

  const products = data.products;
  const totalProducts = products.length;
  const withTests = products.filter((p) => p.testCount > 0).length;
  const totalFiles = products.reduce((sum, p) => sum + p.fileCount, 0);

  const now = Date.now();
  const activeCount = products.filter((p) => {
    if (!p.lastCommitDate) return false;
    const daysSince = (now - new Date(p.lastCommitDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Product Health Scorecard</h1>
        <p className="text-slate-500">Overview of product maturity, activity, and test coverage</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Products" value={totalProducts} color="blue" />
        <StatCard label="With Tests" value={withTests} sublabel={`${totalProducts > 0 ? Math.round((withTests / totalProducts) * 100) : 0}% coverage`} color="green" />
        <StatCard label="Active (7d)" value={activeCount} sublabel="Committed in last week" color="purple" />
        <StatCard label="Total Files" value={totalFiles.toLocaleString()} color="orange" />
      </div>

      {/* Product Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Phase</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Apps</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tests</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Commit</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Files</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.map((product) => {
                const health = healthIndicator(product.lastCommitDate);
                return (
                  <tr
                    key={product.name}
                    onClick={() => navigate(`/products/${product.name}`)}
                    className="hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">{product.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={phaseVariant(product.phase)}>{product.phase}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {product.hasApi && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">API</span>
                        )}
                        {product.hasWeb && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Web</span>
                        )}
                        {!product.hasApi && !product.hasWeb && (
                          <span className="text-xs text-slate-600">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${product.testCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {product.testCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-300" title={product.lastCommit}>
                          {truncateCommit(product.lastCommit)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(product.lastCommitDate)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">{product.fileCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${health.color}`} />
                        <span className="text-xs text-slate-500">{health.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
