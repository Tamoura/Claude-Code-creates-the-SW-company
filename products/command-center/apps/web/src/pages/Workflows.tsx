import { useState } from 'react';
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
  'architect': 'text-blue-400',
  'backend-engineer': 'text-green-400',
  'frontend-engineer': 'text-amber-400',
  'qa-engineer': 'text-red-400',
  'devops-engineer': 'text-cyan-400',
  'technical-writer': 'text-indigo-400',
  'orchestrator': 'text-yellow-400',
};

const agentBgMap: Record<string, string> = {
  'product-manager': 'bg-purple-500',
  'architect': 'bg-blue-500',
  'backend-engineer': 'bg-green-500',
  'frontend-engineer': 'bg-amber-500',
  'qa-engineer': 'bg-red-500',
  'devops-engineer': 'bg-cyan-500',
  'technical-writer': 'bg-indigo-500',
  'orchestrator': 'bg-yellow-500',
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

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load workflows</p>;

  const { workflows } = data;

  const totalTasks = workflows.reduce((sum, w) => sum + w.taskCount, 0);
  const avgDuration = Math.round(workflows.reduce((sum, w) => sum + w.estimatedMinutes, 0) / workflows.length);
  const uniqueAgents = new Set(workflows.flatMap(w => w.agents));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Workflows</h1>
      <p className="text-gray-500 mb-8">Company workflow definitions and execution diagrams</p>

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
}

function WorkflowCard({ workflow, expanded, onToggle }: WorkflowCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Collapsed Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
            <Badge variant="info">{workflow.workflowType}</Badge>
          </div>
          <p className="text-sm text-gray-400 mb-3">{workflow.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{workflow.taskCount} tasks</span>
            <span>&middot;</span>
            <span>{formatTime(workflow.estimatedMinutes)}</span>
          </div>
        </div>
      </div>

      {/* Agent Avatars */}
      <div className="flex items-center gap-2 mb-4">
        {workflow.agents.map((agent, idx) => {
          const bgClass = agentBgMap[agent] || 'bg-gray-500';
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
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
      >
        {expanded ? '▼ Collapse' : '▶ Expand diagram & tasks'}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-6 space-y-6">
          {/* Mermaid Diagram */}
          <div className="border-t border-gray-800 pt-6">
            <h4 className="text-sm font-semibold text-white mb-3">Execution Flow</h4>
            <MarkdownRenderer content={`\`\`\`mermaid\n${workflow.mermaid}\n\`\`\``} />
          </div>

          {/* Task List Table */}
          <div className="border-t border-gray-800 pt-6">
            <h4 className="text-sm font-semibold text-white mb-3">Task Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Task</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Agent</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Dependencies</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Parallel</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {workflow.tasks.map((task) => {
                    const agentColor = agentColorMap[task.agent] || 'text-gray-400';
                    return (
                      <tr key={task.id} className="even:bg-gray-900/50 odd:bg-gray-900 hover:bg-gray-800/50 transition-colors">
                        <td className="px-3 py-2 text-xs text-gray-500">{task.id}</td>
                        <td className="px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
                          {task.checkpoint && <span className="text-yellow-400" title="Checkpoint">★</span>}
                          {task.name}
                        </td>
                        <td className={`px-3 py-2 text-sm font-medium ${agentColor}`}>{task.agent}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {task.dependsOn.length > 0 ? task.dependsOn.join(', ') : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {task.parallelOk ? '✓' : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'default'}>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{formatTime(task.estimatedMinutes)}</td>
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
      <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
