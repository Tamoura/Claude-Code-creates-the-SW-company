import {
  Shield,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Brain,
  CheckCircle2,
  AlertCircle,
  Minus,
} from 'lucide-react';
import Link from 'next/link';

// Mock data — will be replaced by real API calls
const stats = [
  {
    label: 'Risk Score',
    value: '6.2',
    trend: '+0.3',
    trendDir: 'up' as const,
    icon: Shield,
    color: 'text-warning',
    bg: 'bg-warning-light',
  },
  {
    label: 'Monthly Cloud Spend',
    value: '$24,580',
    trend: '-8%',
    trendDir: 'down' as const,
    icon: DollarSign,
    color: 'text-success',
    bg: 'bg-success-light',
  },
  {
    label: 'Advisory Sessions',
    value: '47',
    trend: '+12',
    trendDir: 'up' as const,
    icon: MessageSquare,
    color: 'text-brand',
    bg: 'bg-brand-light',
  },
  {
    label: 'Open Risks',
    value: '13',
    trend: '-2',
    trendDir: 'down' as const,
    icon: AlertTriangle,
    color: 'text-error',
    bg: 'bg-error-light',
  },
];

const riskCategories = [
  { name: 'Tech Debt', count: 5, severity: 'High', color: 'bg-risk-tech-debt', textColor: 'text-risk-tech-debt' },
  { name: 'Vendor Risk', count: 3, severity: 'Medium', color: 'bg-risk-vendor', textColor: 'text-risk-vendor' },
  { name: 'Compliance', count: 3, severity: 'High', color: 'bg-risk-compliance', textColor: 'text-risk-compliance' },
  { name: 'Operational', count: 2, severity: 'Low', color: 'bg-risk-operational', textColor: 'text-risk-operational' },
];

const recentConversations = [
  {
    id: '1',
    title: 'Should we migrate from AWS to GCP?',
    time: '2 hours ago',
    status: 'completed',
  },
  {
    id: '2',
    title: 'SOC2 compliance readiness assessment',
    time: '5 hours ago',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Kubernetes vs ECS for our team of 4',
    time: 'Yesterday',
    status: 'completed',
  },
];

const recommendations = [
  {
    title: 'Upgrade Node.js to v20 LTS',
    category: 'Tech Debt',
    severity: 'high',
    description: 'Node.js 18 reaches EOL in April 2025. 3 services affected.',
  },
  {
    title: 'Review AWS single-region deployment',
    category: 'Operational',
    severity: 'medium',
    description: 'All services in us-east-1. Consider multi-region for 99.99% SLA.',
  },
  {
    title: 'Implement SBOM for supply chain compliance',
    category: 'Compliance',
    severity: 'medium',
    description: 'Required for enterprise customers under EU Cyber Resilience Act.',
  },
];

function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    critical: 'bg-severity-critical text-white',
    high: 'bg-severity-high text-white',
    medium: 'bg-severity-medium text-white',
    low: 'bg-severity-low text-white',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro uppercase ${
        styles[severity as keyof typeof styles] || styles.medium
      }`}
    >
      {severity}
    </span>
  );
}

function TrendIndicator({ value, direction }: { value: string; direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-caption text-success">
        <TrendingUp className="h-3.5 w-3.5" />
        {value}
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-caption text-error">
        <TrendingDown className="h-3.5 w-3.5" />
        {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-caption text-slate-400">
      <Minus className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-h1 text-slate-900">Dashboard</h1>
        <p className="text-body-sm mt-1 text-slate-500">
          Overview of your technology advisory insights
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-ring"
          >
            <div className="flex items-center justify-between">
              <p className="text-overline text-slate-500">{stat.label}</p>
              <div className={`${stat.bg} rounded-[8px] p-1.5`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="font-tabular mt-2 text-[36px] font-semibold leading-[1.15] tracking-[-0.025em] text-slate-900">
              {stat.value}
            </p>
            <TrendIndicator
              value={`${stat.trend} from last month`}
              direction={stat.trendDir === 'down' && stat.label !== 'Open Risks' ? 'down' : stat.trendDir === 'down' ? 'up' : 'up'}
            />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Risk summary - 2 cols */}
        <div className="lg:col-span-2">
          <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-h3 text-slate-900">Risk Overview</h2>
              <Link
                href="/risks"
                className="inline-flex items-center gap-1 text-body-sm font-medium text-brand hover:text-brand-hover"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Risk category bars */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {riskCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="rounded-[8px] border border-slate-200 p-4"
                    style={{ borderLeftWidth: '4px', borderLeftColor: `var(--color-risk-${cat.name.toLowerCase().replace(' ', '-')})` }}
                  >
                    <p className="text-overline text-slate-500">{cat.name}</p>
                    <p className="font-tabular mt-1 text-2xl font-semibold tracking-[-0.021em] text-slate-900">
                      {cat.count}
                    </p>
                    <SeverityBadge severity={cat.severity.toLowerCase()} />
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="mt-6">
                <h3 className="text-body-sm font-medium text-slate-700">Top Recommendations</h3>
                <div className="mt-3 space-y-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.title}
                      className="flex items-start gap-3 rounded-[8px] border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-body-sm font-medium text-slate-900">{rec.title}</p>
                          <SeverityBadge severity={rec.severity} />
                        </div>
                        <p className="text-caption mt-0.5 text-slate-500">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent conversations - 1 col */}
        <div>
          <div className="rounded-[12px] border border-slate-200 bg-white shadow-ring">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-h3 text-slate-900">Recent Conversations</h2>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1 text-body-sm font-medium text-brand hover:text-brand-hover"
              >
                New chat
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-brand-light">
                    <Brain className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-slate-900">
                      {conv.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-caption text-slate-400">{conv.time}</span>
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-3">
              <Link
                href="/chat"
                className="text-body-sm font-medium text-brand hover:text-brand-hover"
              >
                View all conversations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
