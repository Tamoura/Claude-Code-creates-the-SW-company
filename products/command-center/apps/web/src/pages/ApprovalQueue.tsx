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
  { label: string; color: string; borderColor: string }
> = {
  checkpoint: { label: 'Checkpoint', color: 'text-blue-400', borderColor: 'border-l-blue-500' },
  architecture: { label: 'Architecture', color: 'text-purple-400', borderColor: 'border-l-purple-500' },
  deployment: { label: 'Deployment', color: 'text-emerald-400', borderColor: 'border-l-emerald-500' },
  blocker: { label: 'Blocker', color: 'text-red-400', borderColor: 'border-l-red-500' },
};

const statusConfig: Record<
  ApprovalItem['status'],
  { label: string; variant: 'success' | 'danger' | 'warning' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

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

  const cfg = typeConfig[item.type];
  const statusCfg = statusConfig[item.status];

  const handle = useCallback(
    async (action: 'approve' | 'reject') => {
      setActing(true);
      try {
        await resolveItem(item.id, action, noteInput || undefined);
        onResolved();
      } catch {
        // swallow — user can retry
      } finally {
        setActing(false);
      }
    },
    [item.id, noteInput, onResolved],
  );

  return (
    <div
      className={`bg-gray-900 border border-gray-800 border-l-4 ${cfg.borderColor} rounded-xl p-5 hover:border-gray-700 transition-colors`}
    >
      <div className="flex items-start justify-between gap-4">
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
          <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span>by <span className="text-gray-400">{item.requestedBy}</span></span>
            <span>{formatRelativeTime(item.requestedAt)}</span>
            {item.resolvedAt && (
              <span>resolved {formatRelativeTime(item.resolvedAt)}</span>
            )}
          </div>

          {/* Resolved note */}
          {item.resolvedNote && (
            <div className="mt-3 bg-gray-800/50 rounded-lg px-3 py-2 text-xs text-gray-400">
              Note: {item.resolvedNote}
            </div>
          )}

          {/* Action panel — only for pending */}
          {item.status === 'pending' && (
            <div className="mt-4">
              {expanded ? (
                <div className="space-y-3">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Optional note (visible in history)…"
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handle('approve')}
                      disabled={acting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {acting ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handle('reject')}
                      disabled={acting}
                      className="px-4 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {acting ? 'Saving…' : 'Reject'}
                    </button>
                    <button
                      onClick={() => setExpanded(false)}
                      className="px-3 py-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Review →
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
    if (!data) return { pending: 0, resolved: 0 };
    return {
      pending: data.items.filter((i) => i.status === 'pending').length,
      resolved: data.items.filter((i) => i.status !== 'pending').length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'pending') return data.items.filter((i) => i.status === 'pending');
    if (activeTab === 'resolved') return data.items.filter((i) => i.status !== 'pending');
    return data.items;
  }, [data, activeTab]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load approval queue</p>;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${data.items.length})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Approval Queue</h1>
      <p className="text-gray-500 mb-8">CEO checkpoints, architecture reviews, and deployment approvals</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending" value={counts.pending} color="orange" />
        <StatCard
          label="Approved"
          value={data.items.filter((i) => i.status === 'approved').length}
          color="green"
        />
        <StatCard
          label="Rejected"
          value={data.items.filter((i) => i.status === 'rejected').length}
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
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
          <p className="text-gray-400 text-sm">Queue is empty</p>
        </div>
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

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
