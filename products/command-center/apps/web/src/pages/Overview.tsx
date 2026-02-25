import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

// ─── Data interfaces ────────────────────────────────────────────────────────

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
  recentAudit: Array<{
    timestamp: string;
    type: string;
    summary?: string;
    product?: string;
    agent?: string;
  }>;
  recentCommits: Array<{
    shortHash: string;
    author: string;
    date: string;
    message: string;
  }>;
}

interface AuditReport {
  product: string;
  overallScore: number | null;
  lastModified: string;
  excerpt: string;
  qualityReports: string[];
}

interface AuditData {
  reports: AuditReport[];
  stats: {
    total: number;
    audited: number;
    avgScore: number | null;
    topScore: number | null;
  };
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  product: string;
  timestamp: string;
}

interface AlertsData {
  alerts: Alert[];
}

interface HealthProduct {
  name: string;
  displayName: string;
  phase: string;
  buildStatus: string;
  testCount: number;
  lastCommit: string;
  lastCommitDate: string;
  auditScore: number | null;
  fileCount: number;
  hasApi: boolean;
  hasWeb: boolean;
}

interface HealthData {
  products: HealthProduct[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function phaseVariant(phase: string): 'success' | 'warning' | 'info' | 'default' {
  if (phase === 'Production') return 'success';
  if (phase === 'Foundation') return 'warning';
  if (phase === 'MVP') return 'info';
  return 'default';
}

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-600';
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-amber-400';
  return 'text-red-400';
}

const PHASE_COLORS: Record<string, string> = {
  Production: 'bg-emerald-500',
  Foundation: 'bg-amber-500',
  MVP: 'bg-blue-500',
  Planned: 'bg-gray-600',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const order = ['Production', 'MVP', 'Foundation', 'Planned'];
  const entries = order
    .filter((p) => breakdown[p] > 0)
    .map((p) => ({ phase: p, count: breakdown[p], pct: Math.round((breakdown[p] / total) * 100) }));

  // Add any phases not in the standard order
  Object.entries(breakdown).forEach(([p, c]) => {
    if (!order.includes(p) && c > 0) {
      entries.push({ phase: p, count: c, pct: Math.round((c / total) * 100) });
    }
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Phase Distribution</h2>
      <div className="flex rounded-lg overflow-hidden h-4 mb-3">
        {entries.map(({ phase, pct }) => (
          <div
            key={phase}
            className={`${PHASE_COLORS[phase] ?? 'bg-gray-600'} transition-all`}
            style={{ width: `${pct}%` }}
            title={`${phase}: ${pct}%`}
          />
        ))}
      </div>
      <div className="flex gap-5 flex-wrap">
        {entries.map(({ phase, count, pct }) => (
          <div key={phase} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${PHASE_COLORS[phase] ?? 'bg-gray-600'}`} />
            <span className="text-sm text-gray-400">
              {phase}
              <span className="text-gray-600 ml-1">
                {count} ({pct}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductHealthMatrix({ products }: { products: HealthProduct[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">
        Product Health Matrix
        <span className="ml-2 text-sm font-normal text-gray-500">{products.length} products</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map((p) => (
          <div
            key={p.name}
            className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors"
          >
            {/* Name + Phase */}
            <div className="flex items-start justify-between gap-1 mb-2">
              <p className="text-sm font-medium text-white leading-tight truncate">{p.displayName}</p>
              <Badge variant={phaseVariant(p.phase)}>{p.phase}</Badge>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* Audit score */}
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreColor(p.auditScore)}`} />
                <span className={scoreTextColor(p.auditScore)}>
                  {p.auditScore !== null ? p.auditScore.toFixed(1) : '—'}
                </span>
              </div>

              {/* Build status */}
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    p.buildStatus === 'configured' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-600 truncate">{p.buildStatus}</span>
              </div>

              {/* Test count */}
              <span className="text-gray-600 ml-auto">{p.testCount} tests</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsList({ alerts }: { alerts: Alert[] }) {
  const severityVariant = (s: Alert['severity']): 'danger' | 'warning' | 'info' => {
    if (s === 'error') return 'danger';
    if (s === 'warning') return 'warning';
    return 'info';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">
        Active Alerts
        {alerts.length > 0 && (
          <span className="ml-2 bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </h2>
      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            All systems nominal
          </div>
        )}
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
            <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-300 leading-snug">{alert.message}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {alert.product && <span className="text-gray-500 mr-1">{alert.product}</span>}
                {relativeTime(alert.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentCommits({
  commits,
}: {
  commits: Array<{ shortHash: string; author: string; date: string; message: string }>;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Recent Commits</h2>
      <div className="space-y-3">
        {commits.length === 0 && <p className="text-gray-500 text-sm">No recent commits</p>}
        {commits.map((commit, i) => (
          <div key={i} className="flex items-start gap-3">
            <code className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
              {commit.shortHash}
            </code>
            <div className="min-w-0">
              <p className="text-sm text-gray-300 truncate">{commit.message}</p>
              <p className="text-xs text-gray-600">
                {commit.author} &middot; {relativeTime(commit.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-64 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-80 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="h-24 bg-gray-800 rounded-xl mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-800 rounded-xl" />
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Overview() {
  const overview = useApi<OverviewData>('/overview');
  const auditData = useApi<AuditData>('/audit/reports');
  const alertsData = useApi<AlertsData>('/alerts');
  const healthData = useApi<HealthData>('/health-scorecard');

  const isLoading =
    overview.loading || auditData.loading || alertsData.loading || healthData.loading;

  if (isLoading) return <LoadingSkeleton />;

  if (!overview.data) {
    return <p className="text-red-400">Failed to load overview data</p>;
  }

  const { stats, phaseBreakdown, recentCommits } = overview.data;

  const avgScore = auditData.data?.stats.avgScore ?? null;
  const allAlerts = alertsData.data?.alerts ?? [];
  const openAlerts = allAlerts.filter((a) => a.severity === 'warning' || a.severity === 'error');
  const healthProducts = healthData.data?.products ?? [];

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-white mb-1">Company Command Center</h1>
      <p className="text-gray-500 mb-8">ConnectSW AI Software Company</p>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Products"
          value={stats.totalProducts}
          sublabel={`${stats.productsWithCi} with CI`}
          color="blue"
        />
        <StatCard
          label="AI Agents"
          value={stats.totalAgents}
          sublabel="Specialist roles"
          color="green"
        />
        <StatCard
          label="Avg Quality Score"
          value={avgScore !== null ? avgScore.toFixed(1) : '—'}
          sublabel="Across audited products"
          color="purple"
        />
        <StatCard
          label="Open Alerts"
          value={openAlerts.length}
          sublabel="Warnings and errors"
          color={openAlerts.length > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Phase distribution bar */}
      <PhaseBar breakdown={phaseBreakdown} />

      {/* Product Health Matrix */}
      {healthProducts.length > 0 && <ProductHealthMatrix products={healthProducts} />}

      {/* Bottom two-column: Alerts + Commits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsList alerts={allAlerts} />
        <RecentCommits commits={recentCommits} />
      </div>
    </div>
  );
}
