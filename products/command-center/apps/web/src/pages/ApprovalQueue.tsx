import { useState, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApprovalItem {
  id: string;
  type: 'checkpoint' | 'architecture' | 'deployment' | 'blocker';
  title: string;
  description: string;
  product: string | null;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt: string | null;
  resolvedNote: string | null;
}

interface QueueData {
  items: ApprovalItem[];
}

type FilterTab = 'all' | 'pending' | 'resolved';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const typeConfig: Record<
  ApprovalItem['type'],
  { label: string; color: string; borderColor: string; icon: string }
> = {
  checkpoint: {
    label: 'Checkpoint',
    color: 'text-indigo-400',
    borderColor: 'border-l-indigo-500',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  architecture: {
    label: 'Architecture',
    color: 'text-purple-400',
    borderColor: 'border-l-purple-500',
    icon: 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  },
  deployment: {
    label: 'Deployment',
    color: 'text-emerald-400',
    borderColor: 'border-l-emerald-500',
    icon: 'M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z',
  },
  blocker: {
    label: 'Blocker',
    color: 'text-rose-400',
    borderColor: 'border-l-rose-500',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
};

const statusConfig: Record<
  ApprovalItem['status'],
  { label: string; variant: 'success' | 'danger' | 'warning' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const agentLabels: Record<string, string> = {
  orchestrator: 'Orchestrator',
  architect: 'Architect',
  devops: 'DevOps Engineer',
  'backend-engineer': 'Backend Engineer',
  'frontend-engineer': 'Frontend Engineer',
  'qa-engineer': 'QA Engineer',
  'security-engineer': 'Security Engineer',
};

function agentLabel(raw: string): string {
  return agentLabels[raw] ?? raw;
}

// ─── Action helpers ───────────────────────────────────────────────────────────

async function resolveItem(
  id: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  const res = await fetch(`/api/v1/approval-queue/${id}/${action}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} item`);
}

// ─── How it works banner ──────────────────────────────────────────────────────

function HowItWorksBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-8 bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-5 flex gap-4">
      <div className="flex-shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-indigo-300 mb-1">How the Approval Queue works</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          When AI agents (Orchestrator, Architect, DevOps, etc.) reach a decision point that requires your input,
          they submit a request here instead of proceeding on their own. This gives you control over key milestones —
          feature sign-offs, architecture choices, deployments, and anything that&apos;s blocked waiting on you.
          <br /><br />
          Review each card below, optionally add a note, then <strong className="text-emerald-400">Approve</strong> to
          let the agent continue or <strong className="text-rose-400">Reject</strong> to redirect it.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onResolved,
}: {
  item: ApprovalItem;
  onResolved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = typeConfig[item.type];
  const statusCfg = statusConfig[item.status];

  const handle = useCallback(
    async (action: 'approve' | 'reject') => {
      setActing(true);
      setError(null);
      try {
        await resolveItem(item.id, action, noteInput || undefined);
        onResolved();
      } catch {
        setError('Failed to save. Please try again.');
      } finally {
        setActing(false);
      }
    },
    [item.id, noteInput, onResolved],
  );

  return (
    <div
      className={`bg-slate-900 border border-slate-800 border-l-4 ${cfg.borderColor} rounded-xl p-5 transition-colors ${
        item.status === 'pending' ? 'hover:border-slate-700' : 'opacity-70'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center ${cfg.color}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
              {cfg.label}
            </span>
            {item.product && <Badge variant="info">{item.product}</Badge>}
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>

          <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>
              Requested by{' '}
              <span className="text-slate-400 font-medium">{agentLabel(item.requestedBy)}</span>
            </span>
            <span className="text-slate-700">·</span>
            <span>{formatRelativeTime(item.requestedAt)}</span>
            {item.resolvedAt && (
              <>
                <span className="text-slate-700">·</span>
                <span>resolved {formatRelativeTime(item.resolvedAt)}</span>
              </>
            )}
          </div>

          {/* Resolved note */}
          {item.resolvedNote && (
            <div className="mt-3 bg-slate-800/50 rounded-lg px-3 py-2 text-xs text-slate-400 flex gap-2">
              <span className="text-slate-600">Note:</span>
              <span>{item.resolvedNote}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-2 text-xs text-rose-400">{error}</p>
          )}

          {/* Action panel — only for pending */}
          {item.status === 'pending' && (
            <div className="mt-4">
              {expanded ? (
                <div className="space-y-3">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Optional note (recorded in history)…"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handle('approve')}
                      disabled={acting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {acting ? 'Saving…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handle('reject')}
                      disabled={acting}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {acting ? 'Saving…' : '✕ Reject'}
                    </button>
                    <button
                      onClick={() => { setExpanded(false); setNoteInput(''); setError(null); }}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1"
                >
                  Review this request
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApprovalQueue() {
  const { data, loading, refetch } = useApi<QueueData>('/approval-queue');
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');

  const counts = useMemo(() => {
    if (!data) return { pending: 0, resolved: 0, approved: 0, rejected: 0 };
    return {
      pending: data.items.filter((i) => i.status === 'pending').length,
      resolved: data.items.filter((i) => i.status !== 'pending').length,
      approved: data.items.filter((i) => i.status === 'approved').length,
      rejected: data.items.filter((i) => i.status === 'rejected').length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'pending') return data.items.filter((i) => i.status === 'pending');
    if (activeTab === 'resolved') return data.items.filter((i) => i.status !== 'pending');
    return data.items;
  }, [data, activeTab]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load approval queue</p>;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All  (${data.items.length})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Approval Queue</h1>
        <p className="text-slate-500 text-sm">
          Requests from AI agents waiting for your decision before they can proceed.
        </p>
      </div>

      <HowItWorksBanner />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Awaiting Your Review"
          value={counts.pending}
          color="orange"
          sublabel={counts.pending === 0 ? 'All clear' : 'Action required'}
        />
        <StatCard
          label="Approved"
          value={counts.approved}
          color="green"
          sublabel="Agents unblocked"
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          color="red"
          sublabel="Redirected"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onResolved={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const isPending = tab === 'pending' || tab === 'all';
  return (
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
      <p className="text-slate-300 text-sm font-medium mb-1">
        {isPending ? 'No pending requests' : 'Nothing here yet'}
      </p>
      <p className="text-slate-600 text-xs">
        {isPending
          ? 'Agents are working autonomously — when one needs your input it will appear here.'
          : 'Resolved requests will show up here after you approve or reject them.'}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="h-24 bg-slate-800 rounded-xl mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
