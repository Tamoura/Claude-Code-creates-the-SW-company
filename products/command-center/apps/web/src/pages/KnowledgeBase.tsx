import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface Pattern { id: string; problem: string; solution: string; agent?: string; product?: string; codeSnippet?: string }
interface AntiPattern { id: string; pattern: string; consequence: string; prevention: string }
interface Gotcha { id: string; description: string; agent?: string; resolution: string }
interface AgentExperience { agent: string; tasksCompleted: number; successRate: number; commonMistakes: string[]; preferredApproaches: string[] }
interface KBData { patterns: Pattern[]; antiPatterns: AntiPattern[]; gotchas: Gotcha[]; agentExperiences: AgentExperience[] }

const TABS = ['Patterns', 'Anti-Patterns', 'Gotchas', 'Agent Experiences'] as const;
type Tab = (typeof TABS)[number];

export default function KnowledgeBase() {
  const { data, loading } = useApi<KBData>('/knowledge-base');
  const [activeTab, setActiveTab] = useState<Tab>('Patterns');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KBData | null>(null);
  const [searching, setSearching] = useState(false);
  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/knowledge-base/search?q=${encodeURIComponent(term)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  function toggleSnippet(id: string) {
    setExpandedSnippets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load knowledge base</p>;

  const display = searchResults ?? data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Knowledge Base</h1>
      <p className="text-gray-500 mb-6">Patterns, anti-patterns, gotchas, and agent learnings</p>

      {/* Search */}
      <div className="relative mb-8">
        <svg className="absolute left-3 top-3 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns, anti-patterns, gotchas..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {searching && <span className="absolute right-3 top-3 text-xs text-gray-500">Searching...</span>}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Patterns" value={display.patterns.length} color="blue" />
        <StatCard label="Anti-Patterns" value={display.antiPatterns.length} color="red" />
        <StatCard label="Gotchas" value={display.gotchas.length} color="orange" />
        <StatCard label="Agent Experiences" value={display.agentExperiences.length} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Patterns' && (
        <div className="grid gap-4">
          {display.patterns.length === 0 && <p className="text-gray-500 text-sm">No patterns found</p>}
          {display.patterns.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-white font-semibold mb-2">{p.problem}</p>
              <p className="text-gray-400 text-sm mb-3">{p.solution}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {p.agent && <Badge variant="info">{p.agent}</Badge>}
                {p.product && <Badge variant="success">{p.product}</Badge>}
                {p.codeSnippet && (
                  <button
                    onClick={() => toggleSnippet(p.id)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {expandedSnippets.has(p.id) ? 'Hide code' : 'Show code'}
                  </button>
                )}
              </div>
              {p.codeSnippet && expandedSnippets.has(p.id) && (
                <pre className="mt-3 bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto font-mono text-xs text-gray-300">
                  {p.codeSnippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Anti-Patterns' && (
        <div className="grid gap-4">
          {display.antiPatterns.length === 0 && <p className="text-gray-500 text-sm">No anti-patterns found</p>}
          {display.antiPatterns.map((ap) => (
            <div key={ap.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-white font-semibold mb-2">{ap.pattern}</p>
              <p className="text-red-400 text-sm mb-2">{ap.consequence}</p>
              <p className="text-gray-400 text-sm">{ap.prevention}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Gotchas' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {display.gotchas.length === 0 && <p className="text-gray-500 text-sm p-5">No gotchas found</p>}
          {display.gotchas.map((g) => (
            <div key={g.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-gray-300 text-sm">{g.description}</p>
                  <p className="text-gray-500 text-xs mt-1">{g.resolution}</p>
                </div>
                {g.agent && <Badge variant="info">{g.agent}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Agent Experiences' && (
        <div className="grid gap-4">
          {display.agentExperiences.length === 0 && <p className="text-gray-500 text-sm">No agent experiences found</p>}
          {display.agentExperiences.map((ae) => (
            <div key={ae.agent} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">{ae.agent}</p>
                  <p className="text-gray-500 text-xs">{ae.tasksCompleted} tasks completed</p>
                </div>
                <Badge variant={ae.successRate >= 80 ? 'success' : ae.successRate >= 50 ? 'warning' : 'danger'}>
                  {ae.successRate}% success
                </Badge>
              </div>
              {/* Success rate bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${
                    ae.successRate >= 80 ? 'bg-emerald-500' : ae.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(ae.successRate, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ae.commonMistakes.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Common Mistakes</p>
                    <ul className="space-y-1">
                      {ae.commonMistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-400 mt-0.5">-</span>
                          <span className="text-gray-400">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ae.preferredApproaches.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Preferred Approaches</p>
                    <ul className="space-y-1">
                      {ae.preferredApproaches.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-emerald-400 mt-0.5">-</span>
                          <span className="text-gray-400">{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
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
      <div className="h-4 bg-gray-800 rounded w-80 mb-6" />
      <div className="h-10 bg-gray-800 rounded-lg mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
