import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface Protocol {
  id: string;
  name: string;
  description: string;
  version: string | null;
  createdAt: string | null;
  source: string | null;
  category: string;
  content: string;
  tags: string[];
}

interface ProtocolsResponse {
  protocols: Protocol[];
}

const CATEGORIES = [
  'All',
  'Context Engineering',
  'Quality Assurance',
  'Testing',
  'Execution',
  'Agent Communication',
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'red'> = {
  'Context Engineering': 'blue',
  'Quality Assurance': 'green',
  'Testing': 'purple',
  'Execution': 'orange',
  'Agent Communication': 'red',
};

const BADGE_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  'Context Engineering': 'info',
  'Quality Assurance': 'success',
  'Testing': 'warning',
  'Execution': 'danger',
  'Agent Communication': 'info',
};

// Protocols created on 2026-02-25 are considered "new"
const NEW_PROTOCOL_IDS = new Set([
  'context-engineering',
  'context-compression',
  'direct-delivery',
  'verification-before-completion',
  'anti-rationalization',
  'development-oriented-testing',
  'dynamic-test-generation',
  'repository-back-translation',
  'parallel-execution',
  'agent-message.schema',
  'message-router',
]);

function isNew(protocol: Protocol): boolean {
  if (protocol.createdAt) {
    return protocol.createdAt.startsWith('2026-02-25');
  }
  return NEW_PROTOCOL_IDS.has(protocol.id);
}

export default function Protocols() {
  const { data, loading } = useApi<ProtocolsResponse>('/protocols');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load protocols</p>;

  const protocols = data.protocols ?? [];
  const filtered = activeCategory === 'All'
    ? protocols
    : protocols.filter((p) => p.category === activeCategory);

  // Category counts for stats
  const categoryCounts = protocols.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-white mb-1">Protocols</h1>
      <p className="text-slate-500 mb-6">Governing operating protocols for all ConnectSW agents</p>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Protocols" value={protocols.length} color="blue" />
        <StatCard label="Context Engineering" value={categoryCounts['Context Engineering'] ?? 0} color="blue" />
        <StatCard label="Quality Assurance" value={categoryCounts['Quality Assurance'] ?? 0} color="green" />
        <StatCard label="Testing" value={categoryCounts['Testing'] ?? 0} color="purple" />
        <StatCard label="Execution" value={categoryCounts['Execution'] ?? 0} color="orange" />
        <StatCard label="Agent Comms" value={categoryCounts['Agent Communication'] ?? 0} color="red" />
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeCategory === cat
                ? 'text-indigo-400 border-indigo-400'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {cat}
            {cat !== 'All' && categoryCounts[cat] != null && (
              <span className="ml-1.5 text-xs opacity-60">({categoryCounts[cat]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Protocol cards */}
      {filtered.length === 0 && (
        <p className="text-slate-500 text-sm">No protocols in this category</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((protocol) => {
          const isExpanded = expandedIds.has(protocol.id);
          const badgeVariant = BADGE_VARIANTS[protocol.category] ?? 'info';
          const protocolIsNew = isNew(protocol);

          return (
            <div
              key={protocol.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold text-sm">{protocol.name}</h3>
                    {protocolIsNew && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                        New
                      </span>
                    )}
                  </div>
                  <Badge variant={badgeVariant}>{protocol.category}</Badge>
                </div>

                {/* Description */}
                {protocol.description && (
                  <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
                    {protocol.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3">
                  {protocol.version && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                      v{protocol.version}
                    </span>
                  )}
                  {protocol.createdAt && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                      {protocol.createdAt}
                    </span>
                  )}
                </div>

                {/* Source attribution */}
                {protocol.source && (
                  <p className="text-[11px] text-slate-600 italic mb-3 line-clamp-1" title={protocol.source}>
                    {protocol.source}
                  </p>
                )}

                {/* Tags */}
                {protocol.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {protocol.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-500 border border-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand/collapse button */}
                <button
                  onClick={() => toggleExpand(protocol.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {isExpanded ? 'Collapse' : 'Expand full protocol'}
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-800 px-5 py-4 max-h-[600px] overflow-y-auto">
                  <MarkdownRenderer content={protocol.content} theme="dark" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-96 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {[...Array(6)].map((_, i) => <div key={i} className="h-8 w-24 bg-slate-800 rounded" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-800 rounded-xl" />)}
      </div>
    </div>
  );
}
