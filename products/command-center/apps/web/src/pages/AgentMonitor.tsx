import { useState, useEffect, useRef, useCallback } from 'react';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import { useApi } from '../hooks/useApi.js';

// ─── Data interfaces ────────────────────────────────────────────────────────

interface Job {
  id: string;
  command: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
  exitCode: number | null;
  output: string[];
}

interface JobsData {
  jobs: Job[];
}

interface AgentExperience {
  role: string;
  tasksCompleted: number;
  successRate: number; // 0–100
  avgDuration: string; // e.g. "45m"
  patterns: string[];
}

interface KBData {
  agentExperiences: AgentExperience[];
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(startIso: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '-';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

const statusVariant = (status: string): 'info' | 'success' | 'danger' | 'warning' | 'default' => {
  if (status === 'running') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'cancelled') return 'warning';
  return 'default';
};

function successRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-400';
  if (rate >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function successRateBarColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatRole(role: string): string {
  return role
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Agent Leaderboard ───────────────────────────────────────────────────────

function AgentLeaderboard({ experiences }: { experiences: AgentExperience[] }) {
  if (experiences.length === 0) return null;

  const sorted = [...experiences].sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">Agent Performance</h2>
        <span className="text-xs text-gray-500">{experiences.length} agents tracked</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Agent Role
              </th>
              <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-6">
                Tasks
              </th>
              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ minWidth: '160px' }}>
                Success Rate
              </th>
              <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Avg Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((agent) => (
              <tr key={agent.role} className="hover:bg-gray-800/40 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-300 font-bold">
                        {agent.role.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-200">{formatRole(agent.role)}</span>
                  </div>
                </td>
                <td className="py-3 text-right pr-6">
                  <span className="text-sm font-medium text-white">{agent.tasksCompleted}</span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5" style={{ minWidth: '80px' }}>
                      <div
                        className={`h-1.5 rounded-full ${successRateBarColor(agent.successRate)}`}
                        style={{ width: `${agent.successRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums w-10 text-right ${successRateColor(agent.successRate)}`}>
                      {agent.successRate}%
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm text-gray-400">{agent.avgDuration}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="h-48 bg-gray-800 rounded-xl mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AgentMonitor() {
  const [data, setData] = useState<JobsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const outputRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const kb = useApi<KBData>('/knowledge-base');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/invoke');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* ignore polling errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    if (!polling) return;
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, polling]);

  // Auto-scroll active job output
  useEffect(() => {
    outputRefs.current.forEach((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }, [data]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load job data</p>;

  const jobs = data.jobs ?? [];
  const running = jobs.filter((j) => j.status === 'running');
  const completed = jobs.filter((j) => j.status === 'completed');
  const failed = jobs.filter((j) => j.status === 'failed');
  const sorted = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const agentExperiences: AgentExperience[] = kb.data?.agentExperiences ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white">Live Agent Monitor</h1>
        {polling && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-8">
        <p className="text-gray-500">Real-time job monitoring and history</p>
        <button
          onClick={() => setPolling((p) => !p)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {polling ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Agent Leaderboard */}
      {!kb.loading && <AgentLeaderboard experiences={agentExperiences} />}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Jobs" value={jobs.length} color="blue" />
        <StatCard label="Running" value={running.length} color="purple" />
        <StatCard label="Completed" value={completed.length} color="green" />
        <StatCard label="Failed" value={failed.length} color="red" />
      </div>

      {/* Active Jobs */}
      {running.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Active Jobs</h2>
          <div className="grid gap-4">
            {running.map((job) => (
              <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <code className="text-sm text-gray-200 font-mono">{job.command}</code>
                  </div>
                  <span className="text-xs text-gray-500">{formatElapsed(job.createdAt)}</span>
                </div>
                <div
                  ref={(el) => {
                    if (el) outputRefs.current.set(job.id, el);
                  }}
                  className="bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto"
                >
                  {(job.output ?? []).slice(-5).map((line, i) => (
                    <div
                      key={i}
                      className="font-mono text-xs text-green-400 leading-5 whitespace-pre-wrap break-all"
                    >
                      {line}
                    </div>
                  ))}
                  {(job.output ?? []).length === 0 && (
                    <span className="font-mono text-xs text-gray-600">Waiting for output...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job History Table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Job History</h2>
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm">No jobs recorded yet</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Command
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Exit Code
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sorted.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        {shortId(job.id)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-300 font-mono">{job.command}</code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {job.status === 'running'
                        ? formatElapsed(job.createdAt)
                        : formatDuration(job.createdAt, job.completedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {job.exitCode !== null ? job.exitCode : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
