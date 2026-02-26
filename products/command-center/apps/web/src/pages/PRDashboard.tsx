import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PR {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: string;
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown';
  ageHours: number;
}

interface PRDashboardData {
  open: PR[];
  recentlyClosed: PR[];
  stats: {
    total: number;
    open: number;
    draft: number;
    approved: number;
    needsReview: number;
    ciFailures: number;
  };
}

type ViewTab = 'open' | 'closed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(hours: number): string {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ciConfig = {
  success: { label: 'CI Pass', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  failure: { label: 'CI Fail', dot: 'bg-rose-500', text: 'text-rose-400' },
  pending: { label: 'CI Running', dot: 'bg-amber-500', text: 'text-amber-400' },
  unknown: { label: 'CI Unknown', dot: 'bg-slate-500', text: 'text-slate-400' },
};

const reviewConfig: Record<
  string,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }
> = {
  APPROVED: { label: 'Approved', variant: 'success' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'danger' },
  REVIEW_REQUIRED: { label: 'Needs Review', variant: 'warning' },
};

// ─── PRCard ───────────────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PR }) {
  const ci = ciConfig[pr.ciStatus];
  const review = pr.reviewDecision ? reviewConfig[pr.reviewDecision] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start gap-3">
        {/* PR number */}
        <div className="flex-shrink-0 w-10 text-center">
          <span className="text-xs font-mono text-slate-500">#{pr.number}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white truncate">{pr.title}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {pr.isDraft && <Badge>Draft</Badge>}
              {review && <Badge variant={review.variant}>{review.label}</Badge>}
            </div>
          </div>

          {/* Branch info */}
          <p className="text-xs text-slate-500 mt-1 font-mono truncate">
            {pr.headBranch} → {pr.baseBranch}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-slate-500">by <span className="text-slate-400">{pr.author}</span></span>
            <span className="text-xs text-slate-600">age: <span className="text-slate-500">{formatAge(pr.ageHours)}</span></span>

            {/* CI dot */}
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${ci.dot}`} />
              <span className={`text-xs ${ci.text}`}>{ci.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PRDashboard() {
  const { data, loading, refetch } = useApi<PRDashboardData>('/pr-dashboard');
  const [activeTab, setActiveTab] = useState<ViewTab>('open');
  const [ciFilter, setCiFilter] = useState<'all' | 'failure' | 'pending'>('all');

  const displayedPRs = useMemo(() => {
    if (!data) return [];
    const base = activeTab === 'open' ? data.open : data.recentlyClosed;
    if (ciFilter === 'all') return base;
    return base.filter((pr) => pr.ciStatus === ciFilter);
  }, [data, activeTab, ciFilter]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load PR dashboard</p>;

  const { stats } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">PR Dashboard</h1>
        <button
          onClick={refetch}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>
      <p className="text-slate-500 mb-8">Open pull requests across all ConnectSW products</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Open PRs" value={stats.open} color="blue" />
        <StatCard label="Needs Review" value={stats.needsReview} color="orange" />
        <StatCard label="CI Failures" value={stats.ciFailures} color="red" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Approved" value={stats.approved} color="green" />
        <StatCard label="Draft" value={stats.draft} />
        <StatCard label="Total (open+closed)" value={stats.total} />
      </div>

      {/* View tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
          {(['open', 'closed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'open'
                ? `Open (${data.open.length})`
                : `Recently Closed (${data.recentlyClosed.length})`}
            </button>
          ))}
        </div>

        {/* CI filter */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
          {(['all', 'failure', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setCiFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                ciFilter === f
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'All CI' : f === 'failure' ? 'Failing' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* PR list */}
      {displayedPRs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <svg
            className="w-12 h-12 text-emerald-500 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-slate-400 text-sm">No PRs match this filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedPRs.map((pr) => (
            <PRCard key={pr.number} pr={pr} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-64 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
