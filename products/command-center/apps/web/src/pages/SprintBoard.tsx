import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string;
  product: string;
  priority: string;
  description?: string;
}

interface OrchestratorState {
  currentTask?: string;
  activeProduct?: string;
}

interface SprintBoardData {
  tasks: Task[];
  orchestratorState: OrchestratorState;
}

export default function SprintBoard() {
  const { data, loading } = useApi<SprintBoardData>('/sprint-board');
  const [productFilter, setProductFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const products = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.tasks.map((t) => t.product))].sort();
  }, [data]);

  const assignees = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.tasks.map((t) => t.assignee))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((t) => {
      if (productFilter !== 'all' && t.product !== productFilter) return false;
      if (assigneeFilter !== 'all' && t.assignee !== assigneeFilter) return false;
      return true;
    });
  }, [data, productFilter, assigneeFilter]);

  const pending = filtered.filter((t) => t.status === 'pending');
  const inProgress = filtered.filter((t) => t.status === 'in-progress');
  const done = filtered.filter((t) => t.status === 'done');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load sprint board</p>;

  const hasOrchestrator = data.orchestratorState.currentTask || data.orchestratorState.activeProduct;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Sprint Board</h1>
      <p className="text-gray-500 mb-8">Track tasks across products and agents</p>

      {/* Orchestrator status bar */}
      {hasOrchestrator && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm text-blue-300">
            Orchestrator active
            {data.orchestratorState.activeProduct && (
              <> on <span className="font-medium">{data.orchestratorState.activeProduct}</span></>
            )}
            {data.orchestratorState.currentTask && (
              <> — {data.orchestratorState.currentTask}</>
            )}
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tasks" value={filtered.length} color="blue" />
        <StatCard label="Pending" value={pending.length} color="orange" />
        <StatCard label="In Progress" value={inProgress.length} color="purple" />
        <StatCard label="Completed" value={done.length} color="green" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-4 mb-6">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-600"
        >
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-600"
        >
          <option value="all">All Assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Kanban board */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No tasks found. Use /orchestrator to create work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KanbanColumn title="Pending" tasks={pending} headerColor="text-gray-400 bg-gray-700/30" />
          <KanbanColumn title="In Progress" tasks={inProgress} headerColor="text-blue-400 bg-blue-500/10" />
          <KanbanColumn title="Done" tasks={done} headerColor="text-emerald-400 bg-emerald-500/10" />
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ title, tasks, headerColor }: { title: string; tasks: Task[]; headerColor: string }) {
  return (
    <div>
      <div className={`rounded-lg px-3 py-2 mb-3 text-sm font-semibold ${headerColor}`}>
        {title} ({tasks.length})
      </div>
      <div className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        {task.priority === 'high' && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />}
        {task.priority === 'medium' && <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />}
        <h4 className="text-sm font-medium text-white">{task.title}</h4>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="info">{task.product}</Badge>
        <Badge>{task.assignee}</Badge>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-40 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-64 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  );
}
