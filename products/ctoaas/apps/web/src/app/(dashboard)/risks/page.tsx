import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const overallRiskScore = {
  value: 6.2,
  trend: '+0.3',
  trendDir: 'up' as const,
  label: 'Medium-High',
};

const riskCategories = [
  {
    name: 'Tech Debt',
    key: 'tech-debt',
    color: 'var(--color-risk-tech-debt)',
    score: 7.1,
    trend: '+0.5',
    count: 5,
    topRisk: 'Node.js 18 EOL — 3 services affected',
  },
  {
    name: 'Vendor Risk',
    key: 'vendor',
    color: 'var(--color-risk-vendor)',
    score: 5.4,
    trend: '-0.2',
    count: 3,
    topRisk: 'Single-vendor dependency on Stripe (98% payment volume)',
  },
  {
    name: 'Compliance',
    key: 'compliance',
    color: 'var(--color-risk-compliance)',
    score: 6.8,
    trend: '+1.2',
    count: 3,
    topRisk: 'SOC2 Type II audit gap — 4 controls missing',
  },
  {
    name: 'Operational',
    key: 'operational',
    color: 'var(--color-risk-operational)',
    score: 4.1,
    trend: '-0.8',
    count: 2,
    topRisk: 'Single-region deployment (us-east-1 only)',
  },
];

const riskItems = [
  {
    id: 'R-001',
    title: 'Node.js 18 End-of-Life',
    category: 'Tech Debt',
    severity: 'high' as const,
    score: 7.5,
    status: 'open' as const,
    trend: 'increasing' as const,
    description: '3 microservices running Node.js 18 which reaches EOL April 2025. Security patches will stop.',
    mitigation: 'Upgrade to Node.js 20 LTS. Estimated 2-3 days per service.',
    updated: '2 days ago',
  },
  {
    id: 'R-002',
    title: 'SOC2 Type II Controls Gap',
    category: 'Compliance',
    severity: 'high' as const,
    score: 7.2,
    status: 'in-progress' as const,
    trend: 'stable' as const,
    description: '4 controls missing for SOC2 Type II certification: access reviews, change management, incident response, vendor assessment.',
    mitigation: 'Implement controls using Vanta or Drata. 6-8 weeks to audit-ready.',
    updated: '1 day ago',
  },
  {
    id: 'R-003',
    title: 'Stripe Single-Vendor Dependency',
    category: 'Vendor Risk',
    severity: 'medium' as const,
    score: 6.0,
    status: 'open' as const,
    trend: 'stable' as const,
    description: '98% of payment volume through Stripe. No fallback payment processor configured.',
    mitigation: 'Add Adyen or Braintree as secondary processor. Abstract payment interface.',
    updated: '5 days ago',
  },
  {
    id: 'R-004',
    title: 'React 17 Legacy Components',
    category: 'Tech Debt',
    severity: 'medium' as const,
    score: 5.8,
    status: 'open' as const,
    trend: 'increasing' as const,
    description: '23 components still using class-based React 17 patterns. Blocking adoption of React Server Components.',
    mitigation: 'Migrate to functional components with hooks. Prioritize shared/common components first.',
    updated: '1 week ago',
  },
  {
    id: 'R-005',
    title: 'Single-Region AWS Deployment',
    category: 'Operational',
    severity: 'medium' as const,
    score: 5.5,
    status: 'planned' as const,
    trend: 'stable' as const,
    description: 'All services deployed in us-east-1. Regional outage would cause complete downtime.',
    mitigation: 'Deploy read replicas to us-west-2. Implement Route53 health checks and failover.',
    updated: '3 days ago',
  },
  {
    id: 'R-006',
    title: 'Missing SBOM for Supply Chain',
    category: 'Compliance',
    severity: 'medium' as const,
    score: 5.2,
    status: 'open' as const,
    trend: 'increasing' as const,
    description: 'No Software Bill of Materials generated. Required for enterprise customers under EU CRA.',
    mitigation: 'Integrate Syft or CycloneDX into CI pipeline. Generate SBOM on each release.',
    updated: '4 days ago',
  },
];

function SeverityBadge({ severity }: { severity: 'critical' | 'high' | 'medium' | 'low' }) {
  const styles = {
    critical: 'bg-severity-critical text-white',
    high: 'bg-severity-high text-white',
    medium: 'bg-severity-medium text-white',
    low: 'bg-severity-low text-white',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro uppercase ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: 'open' | 'in-progress' | 'planned' | 'resolved' }) {
  const styles = {
    open: 'bg-slate-100 text-slate-600',
    'in-progress': 'bg-brand-light text-brand',
    planned: 'bg-info-light text-info',
    resolved: 'bg-success-light text-success',
  };

  const labels = {
    open: 'Open',
    'in-progress': 'In Progress',
    planned: 'Planned',
    resolved: 'Resolved',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 8) return 'text-severity-critical';
    if (s >= 6) return 'text-severity-high';
    if (s >= 4) return 'text-severity-medium';
    return 'text-severity-low';
  };

  return (
    <span className={`font-tabular text-2xl font-semibold tracking-[-0.021em] ${getColor(score)}`}>
      {score.toFixed(1)}
    </span>
  );
}

export default function RisksPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 text-slate-900">Risk Dashboard</h1>
          <p className="text-body-sm mt-1 text-slate-500">
            Proactive risk surfacing across your technology organization
          </p>
        </div>
        <button className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-ring hover:bg-slate-50">
          Export Report
        </button>
      </div>

      {/* Overall score + category cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Overall score card */}
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring">
          <p className="text-overline text-slate-500">OVERALL RISK SCORE</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-tabular text-[48px] font-light leading-[1.08] tracking-[-0.031em] text-severity-high">
              {overallRiskScore.value}
            </span>
            <span className="text-body-sm text-slate-400">/10</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <SeverityBadge severity="high" />
            <span className="flex items-center gap-0.5 text-caption text-severity-high">
              <TrendingUp className="h-3 w-3" />
              {overallRiskScore.trend}
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-severity-high"
              style={{ width: `${overallRiskScore.value * 10}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-caption text-slate-400">
            <span>Low</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Category cards */}
        {riskCategories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-ring"
            style={{ borderLeftWidth: '4px', borderLeftColor: cat.color }}
          >
            <p className="text-overline text-slate-500">{cat.name}</p>
            <ScoreGauge score={cat.score} />
            <div className="mt-1 flex items-center gap-2">
              <span className="text-caption text-slate-500">{cat.count} items</span>
              <span
                className={`flex items-center gap-0.5 text-caption ${
                  cat.trend.startsWith('+') ? 'text-error' : 'text-success'
                }`}
              >
                {cat.trend.startsWith('+') ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {cat.trend}
              </span>
            </div>
            <p className="mt-2 text-caption text-slate-600">{cat.topRisk}</p>
          </div>
        ))}
      </div>

      {/* Risk items table */}
      <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-h3 text-slate-900">All Risk Items</h2>
          <div className="flex items-center gap-2">
            <select className="rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-body-sm text-slate-700">
              <option>All Categories</option>
              <option>Tech Debt</option>
              <option>Vendor Risk</option>
              <option>Compliance</option>
              <option>Operational</option>
            </select>
            <select className="rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-body-sm text-slate-700">
              <option>All Severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 text-left text-overline text-slate-500">Risk</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Severity</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Score</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Trend</th>
                <th className="px-4 py-3 text-left text-overline text-slate-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {riskItems.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-body-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-caption text-slate-500">{item.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-body-sm text-slate-600">{item.category}</span>
                  </td>
                  <td className="px-4 py-4">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-tabular text-body-sm font-semibold text-slate-900">
                      {item.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4">
                    {item.trend === 'increasing' && (
                      <TrendingUp className="h-4 w-4 text-error" />
                    )}
                    {item.trend === 'stable' && (
                      <span className="text-caption text-slate-400">Stable</span>
                    )}
                    {item.trend === 'decreasing' && (
                      <TrendingDown className="h-4 w-4 text-success" />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1 text-caption text-slate-400">
                      <Clock className="h-3 w-3" />
                      {item.updated}
                    </span>
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
