import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface WorkflowTask {
  id: string;
  name: string;
  agent: string;
  dependsOn: string[];
  parallelOk: boolean;
  checkpoint: boolean;
  priority: string;
  estimatedMinutes: number;
}

interface Workflow {
  id: string;
  name: string;
  workflowType: string;
  description: string;
  taskCount: number;
  estimatedMinutes: number;
  phases: string[];
  agents: string[];
  tasks: WorkflowTask[];
  mermaid: string;
}

interface WorkflowsResponse {
  workflows: Workflow[];
}

const agentColorMap: Record<string, string> = {
  'product-manager': 'text-purple-400',
  'architect': 'text-indigo-400',
  'backend-engineer': 'text-green-400',
  'frontend-engineer': 'text-amber-400',
  'qa-engineer': 'text-rose-400',
  'devops-engineer': 'text-cyan-400',
  'technical-writer': 'text-indigo-400',
  'orchestrator': 'text-amber-400',
  'business-analyst': 'text-pink-400',
  'code-reviewer': 'text-rose-400',
  'data-engineer': 'text-teal-400',
  'innovation-specialist': 'text-violet-400',
  'mobile-developer': 'text-orange-400',
  'performance-engineer': 'text-lime-400',
  'product-strategist': 'text-sky-400',
  'security-engineer': 'text-rose-300',
  'support-engineer': 'text-emerald-400',
  'ui-ux-designer': 'text-fuchsia-400',
};

const agentBgMap: Record<string, string> = {
  'product-manager': 'bg-purple-500',
  'architect': 'bg-indigo-500',
  'backend-engineer': 'bg-green-500',
  'frontend-engineer': 'bg-amber-500',
  'qa-engineer': 'bg-rose-500',
  'devops-engineer': 'bg-cyan-500',
  'technical-writer': 'bg-indigo-500',
  'orchestrator': 'bg-amber-500',
  'business-analyst': 'bg-pink-500',
  'code-reviewer': 'bg-rose-500',
  'data-engineer': 'bg-teal-500',
  'innovation-specialist': 'bg-violet-500',
  'mobile-developer': 'bg-orange-500',
  'performance-engineer': 'bg-lime-500',
  'product-strategist': 'bg-sky-500',
  'security-engineer': 'bg-rose-300',
  'support-engineer': 'bg-emerald-500',
  'ui-ux-designer': 'bg-fuchsia-500',
};

function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export default function Workflows() {
  const { data, loading } = useApi<WorkflowsResponse>('/workflows');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullscreenWorkflow, setFullscreenWorkflow] = useState<Workflow | null>(null);

  const closeFullscreen = useCallback(() => setFullscreenWorkflow(null), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenWorkflow) closeFullscreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fullscreenWorkflow, closeFullscreen]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load workflows</p>;

  const { workflows } = data;

  const totalTasks = workflows.reduce((sum, w) => sum + w.taskCount, 0);
  const avgDuration = Math.round(workflows.reduce((sum, w) => sum + w.estimatedMinutes, 0) / workflows.length);
  const uniqueAgents = new Set(workflows.flatMap(w => w.agents));

  // Fullscreen overlay
  if (fullscreenWorkflow) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">{fullscreenWorkflow.name}</h2>
            <Badge variant="info">{fullscreenWorkflow.workflowType}</Badge>
            <span className="text-sm text-slate-500">{fullscreenWorkflow.taskCount} tasks &middot; {formatTime(fullscreenWorkflow.estimatedMinutes)}</span>
          </div>
          <button
            onClick={closeFullscreen}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800"
            title="Exit fullscreen (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            <span className="text-sm">Exit</span>
          </button>
        </div>
        {/* Diagram */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <MarkdownRenderer content={`\`\`\`mermaid\n${fullscreenWorkflow.mermaid}\n\`\`\``} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Workflows</h1>
      <p className="text-slate-500 mb-8">Company workflow definitions and execution diagrams</p>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Workflows" value={workflows.length} sublabel="Defined" color="blue" />
        <StatCard label="Total Tasks" value={totalTasks} sublabel="Across all workflows" color="green" />
        <StatCard label="Avg Duration" value={formatTime(avgDuration)} sublabel="Per workflow" color="purple" />
        <StatCard label="Agents Involved" value={uniqueAgents.size} sublabel="Unique specialists" color="orange" />
      </div>

      {/* Workflow Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map(workflow => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            expanded={expandedId === workflow.id}
            onToggle={() => setExpandedId(expandedId === workflow.id ? null : workflow.id)}
            onFullscreen={() => setFullscreenWorkflow(workflow)}
          />
        ))}
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  workflow: Workflow;
  expanded: boolean;
  onToggle: () => void;
  onFullscreen: () => void;
}

function WorkflowCard({ workflow, expanded, onToggle, onFullscreen }: WorkflowCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {/* Collapsed Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
            <Badge variant="info">{workflow.workflowType}</Badge>
          </div>
          <p className="text-sm text-slate-400 mb-3">{workflow.description}</p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{workflow.taskCount} tasks</span>
            <span>&middot;</span>
            <span>{formatTime(workflow.estimatedMinutes)}</span>
          </div>
        </div>
      </div>

      {/* Agent Avatars */}
      <div className="flex items-center gap-2 mb-4">
        {workflow.agents.map((agent, idx) => {
          const bgClass = agentBgMap[agent] || 'bg-slate-500';
          return (
            <div
              key={idx}
              className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-white text-xs font-semibold`}
              title={agent}
            >
              {agent.charAt(0).toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
      >
        {expanded ? '▼ Collapse' : '▶ Expand diagram & tasks'}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-6 space-y-6">
          {/* Mermaid Diagram */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Execution Flow</h4>
              <button
                onClick={onFullscreen}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-xs"
                title="View fullscreen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Fullscreen
              </button>
            </div>
            <MarkdownRenderer content={`\`\`\`mermaid\n${workflow.mermaid}\n\`\`\``} />
          </div>

          {/* Task List Table */}
          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-sm font-semibold text-white mb-3">Task Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Task</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Agent</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Dependencies</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Parallel</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {workflow.tasks.map((task) => {
                    const agentColor = agentColorMap[task.agent] || 'text-slate-400';
                    return (
                      <tr key={task.id} className="even:bg-slate-900/50 odd:bg-slate-900 hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2 text-xs text-slate-500">{task.id}</td>
                        <td className="px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                          {task.checkpoint && <span className="text-amber-400" title="Checkpoint">★</span>}
                          {task.name}
                        </td>
                        <td className={`px-3 py-2 text-sm font-medium ${agentColor}`}>{task.agent}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {task.dependsOn.length > 0 ? task.dependsOn.join(', ') : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {task.parallelOk ? '✓' : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'default'}>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{formatTime(task.estimatedMinutes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-slate-800 rounded-xl" />)}
      </div>
    </div>
  );
}
