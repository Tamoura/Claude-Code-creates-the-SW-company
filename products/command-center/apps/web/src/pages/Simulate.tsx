import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

// ── Types ──────────────────────────────────────────────────────────────

type WorkflowType = string;

interface WorkflowInfo {
  id: string;
  label: string;
}

interface SimulationTask {
  id: string;
  name: string;
  description: string;
  agent: string;
  dependsOn: string[];
  parallelOk: boolean;
  checkpoint: boolean;
  priority: string;
  estimatedMinutes: number;
  produces: Array<{ name: string; type: string; path: string }>;
  acceptanceCriteria: string[];
}

interface SimulationPhase {
  number: number;
  name: string;
  tasks: SimulationTask[];
  totalMinutes: number;
  parallelMinutes: number;
  isParallel: boolean;
  hasCheckpoint: boolean;
  agents: string[];
}

interface TimelineEntry {
  taskId: string;
  taskName: string;
  agent: string;
  startMinute: number;
  endMinute: number;
  phase: string;
  isCriticalPath: boolean;
}

interface SimulationResult {
  summary: {
    totalPhases: number;
    totalTasks: number;
    totalAgents: number;
    checkpointCount: number;
    sequentialMinutes: number;
    parallelMinutes: number;
    savingsPercent: number;
  };
  phases: SimulationPhase[];
  timeline: TimelineEntry[];
  deliverables: Array<{ name: string; type: string; path: string }>;
  qualityGates: Array<{ name: string; description: string; taskId: string }>;
  mermaidDependency: string;
  mermaidGantt: string;
}

interface SimulationResponse {
  simulation: SimulationResult;
  workflowType?: WorkflowType;
}

interface WorkflowsResponse {
  workflows: WorkflowInfo[];
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

const deliverableIconMap: Record<string, string> = {
  document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  file: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  directory: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
};

function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// ── Main Component ─────────────────────────────────────────────────────

const FALLBACK_WORKFLOWS: WorkflowInfo[] = [
  { id: 'new-product', label: 'New Product' },
  { id: 'new-feature', label: 'New Feature' },
  { id: 'bug-fix', label: 'Bug Fix' },
  { id: 'architecture-review', label: 'Architecture Review' },
  { id: 'security-audit', label: 'Security Audit' },
];

export default function Simulate() {
  const { data: workflowsData, loading: workflowsLoading } = useApi<WorkflowsResponse>('/simulations/workflows');
  const workflows = workflowsData?.workflows ?? FALLBACK_WORKFLOWS;
  const [workflowType, setWorkflowType] = useState<WorkflowType>('new-product');
  const { data, loading } = useApi<SimulationResponse>(`/simulations?type=${workflowType}`);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [fullscreenDiagram, setFullscreenDiagram] = useState<{ title: string; mermaid?: string; timelineData?: { entries: TimelineEntry[]; phases: SimulationPhase[] } } | null>(null);

  // Once workflows load, ensure selected type is valid
  useEffect(() => {
    if (workflows.length > 0 && !workflows.find((w) => w.id === workflowType)) {
      setWorkflowType(workflows[0].id);
    }
  }, [workflows, workflowType]);

  const closeFullscreen = useCallback(() => setFullscreenDiagram(null), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenDiagram) closeFullscreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fullscreenDiagram, closeFullscreen]);

  // Fullscreen overlay
  if (fullscreenDiagram) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-lg font-semibold text-white">{fullscreenDiagram.title}</h2>
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
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            {fullscreenDiagram.mermaid && (
              <MarkdownRenderer content={`\`\`\`mermaid\n${fullscreenDiagram.mermaid}\n\`\`\``} />
            )}
            {fullscreenDiagram.timelineData && (
              <ExecutionTimeline timeline={fullscreenDiagram.timelineData.entries} phases={fullscreenDiagram.timelineData.phases} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-white mb-1">Workflow Simulation</h1>
      <p className="text-slate-500 mb-6">
        Preview every phase, agent, deliverable, and checkpoint for each workflow type
      </p>

      {/* Workflow Type Selector */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {workflowsLoading && (
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-28 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {!workflowsLoading && workflows.map((wf) => (
          <button
            key={wf.id}
            onClick={() => { setWorkflowType(wf.id); setExpandedPhase(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              workflowType === wf.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {wf.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton />}
      {!loading && !data && <p className="text-rose-400">Failed to load simulation</p>}
      {!loading && data && (
        <SimulationContent
          simulation={data.simulation}
          workflowLabel={workflows.find((w) => w.id === workflowType)?.label ?? workflowType}
          expandedPhase={expandedPhase}
          setExpandedPhase={setExpandedPhase}
          setFullscreenDiagram={setFullscreenDiagram}
        />
      )}
    </div>
  );
}

// ── Simulation Content ──────────────────────────────────────────────────

interface SimulationContentProps {
  simulation: SimulationResult;
  workflowLabel: string;
  expandedPhase: number | null;
  setExpandedPhase: (n: number | null) => void;
  setFullscreenDiagram: (d: { title: string; mermaid?: string; timelineData?: { entries: TimelineEntry[]; phases: SimulationPhase[] } } | null) => void;
}

function SimulationContent({ simulation, workflowLabel, expandedPhase, setExpandedPhase, setFullscreenDiagram }: SimulationContentProps) {
  const { summary, phases, timeline, deliverables, qualityGates, mermaidDependency } = simulation;

  return (
    <div>
      {/* Simulation Header */}
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="info">{workflowLabel}</Badge>
        <span className="text-sm text-slate-500">{summary.totalTasks} tasks across {summary.totalPhases} phases</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Phases" value={summary.totalPhases} sublabel="Sequential stages" color="blue" />
        <StatCard label="Tasks" value={summary.totalTasks} sublabel="Total work items" color="green" />
        <StatCard label="Agents" value={summary.totalAgents} sublabel="Unique specialists" color="purple" />
        <StatCard label="Checkpoints" value={summary.checkpointCount} sublabel="CEO review points" color="orange" />
        <StatCard
          label="Sequential Time"
          value={formatTime(summary.sequentialMinutes)}
          sublabel="If done one-by-one"
          color="red"
        />
        <StatCard
          label="Parallel Time"
          value={formatTime(summary.parallelMinutes)}
          sublabel={`${summary.savingsPercent}% faster with parallelization`}
          color="green"
        />
      </div>

      {/* Gantt Timeline */}
      <section className="mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Execution Timeline</h2>
              <p className="text-sm text-slate-500 mt-1">Critical path highlighted — determines minimum total duration</p>
            </div>
            <button
              onClick={() => setFullscreenDiagram({ title: 'Execution Timeline', timelineData: { entries: timeline, phases } })}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Fullscreen
            </button>
          </div>
          <ExecutionTimeline timeline={timeline} phases={phases} />
        </div>
      </section>

      {/* Phase Cards */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Phases</h2>
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.number}
              phase={phase}
              expanded={expandedPhase === phase.number}
              onToggle={() => setExpandedPhase(expandedPhase === phase.number ? null : phase.number)}
            />
          ))}
        </div>
      </section>

      {/* Dependency Diagram */}
      <section className="mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Task Dependencies</h2>
              <p className="text-sm text-slate-500 mt-1">Full dependency graph — agent-colored nodes</p>
            </div>
            <button
              onClick={() => setFullscreenDiagram({ title: 'Task Dependencies', mermaid: mermaidDependency })}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Fullscreen
            </button>
          </div>
          <MarkdownRenderer content={`\`\`\`mermaid\n${mermaidDependency}\n\`\`\``} />
        </div>
      </section>

      {/* Deliverables Summary */}
      <section className="mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Deliverables</h2>
          <p className="text-sm text-slate-500 mb-4">All artifacts produced across all phases</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deliverables.map((d, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={deliverableIconMap[d.type] ?? deliverableIconMap.file} />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">{d.name}</p>
                  <p className="text-xs text-slate-500 truncate" title={d.path}>{d.path}</p>
                  <Badge variant={d.type === 'document' ? 'info' : d.type === 'directory' ? 'warning' : 'default'}>
                    {d.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Gates */}
      <section className="mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quality Gates</h2>
          <p className="text-sm text-slate-500 mb-4">What must pass before CEO review</p>
          <div className="space-y-3">
            {qualityGates.map((gate, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{gate.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{gate.taskId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Execution Timeline ─────────────────────────────────────────────────

function getTickInterval(totalDuration: number): number {
  if (totalDuration <= 120) return 15;
  if (totalDuration <= 480) return 30;
  if (totalDuration <= 960) return 60;
  return 120;
}

function buildTicks(totalDuration: number): number[] {
  const interval = getTickInterval(totalDuration);
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration; t += interval) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== totalDuration) {
    ticks.push(totalDuration);
  }
  return ticks;
}

const LABEL_W = 128; // px — matches w-32

function TimeAxis({ ticks, totalDuration }: { ticks: number[]; totalDuration: number }) {
  return (
    <div className="flex" style={{ marginLeft: LABEL_W }}>
      <div className="flex-1 relative h-5">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute text-[10px] text-slate-500 -translate-x-1/2"
            style={{ left: `${(t / totalDuration) * 100}%` }}
          >
            {formatTime(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExecutionTimeline({ timeline, phases }: { timeline: TimelineEntry[]; phases: SimulationPhase[] }) {
  const totalDuration = Math.max(...timeline.map((e) => e.endMinute), 1);
  const ticks = buildTicks(totalDuration);
  const uniqueAgents = [...new Set(timeline.map((e) => e.agent))];

  // Group entries by phase name in phase order
  const phaseOrder = phases.map((p) => p.name);
  const entriesByPhase: Record<string, TimelineEntry[]> = {};
  for (const entry of timeline) {
    if (!entriesByPhase[entry.phase]) entriesByPhase[entry.phase] = [];
    entriesByPhase[entry.phase].push(entry);
  }

  return (
    <div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          {uniqueAgents.map((agent) => (
            <div key={agent} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${agentBgMap[agent] ?? 'bg-slate-600'}`} />
              <span className="text-xs text-slate-400">{agent}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-700">
            <span className="w-3 h-3 rounded-sm flex-shrink-0 bg-white/20 ring-1 ring-white/40" />
            <span className="text-xs text-slate-400">Critical path</span>
          </div>
        </div>

        {/* Top time axis */}
        <TimeAxis ticks={ticks} totalDuration={totalDuration} />

        {/* Chart body */}
        <div className="relative mt-1">
            {/* Vertical grid lines */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: LABEL_W }}>
            <div className="flex-1 relative">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 border-l border-slate-800/80"
                  style={{ left: `${(t / totalDuration) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* Phase rows */}
          {phaseOrder.map((phaseName) => {
            const phaseObj = phases.find((p) => p.name === phaseName);
            const entries = entriesByPhase[phaseName];
            if (!phaseObj || !entries || entries.length === 0) return null;

            return (
              <div key={phaseName} className="mb-3">
                {/* Phase header */}
                <div className="flex items-center mb-1">
                  <div className="w-32 flex-shrink-0 pr-3 flex justify-end">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Ph.{phaseObj.number}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap px-1">
                      {phaseName}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                </div>

                {/* Task rows */}
                {entries.map((entry) => {
                  const duration = entry.endMinute - entry.startMinute;
                  const leftPct = (entry.startMinute / totalDuration) * 100;
                  const widthPct = Math.max((duration / totalDuration) * 100, 0.8);
                  const showLabel = widthPct > 8;

                  return (
                    <div key={entry.taskId} className="flex items-center group/row">
                      {/* Label column */}
                      <div className="w-32 flex-shrink-0 pr-3 text-right">
                        <p className="text-xs text-slate-400 truncate" title={entry.taskName}>
                          {entry.taskName}
                        </p>
                        <p
                          className={`text-[10px] truncate ${agentColorMap[entry.agent] ?? 'text-slate-500'}`}
                          title={entry.agent}
                        >
                          {entry.agent}
                        </p>
                      </div>

                      {/* Bar track */}
                      <div className="flex-1 relative h-7 flex items-center">
                        <div
                          className={`absolute h-5 rounded-sm flex items-center justify-end overflow-hidden ${
                            agentBgMap[entry.agent] ?? 'bg-slate-600'
                          } ${
                            entry.isCriticalPath
                              ? 'ring-1 ring-white/30 brightness-110'
                              : 'opacity-70 group-hover/row:opacity-90'
                          }`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${entry.taskId}: ${entry.taskName}\nAgent: ${entry.agent}\n${formatTime(entry.startMinute)} → ${formatTime(entry.endMinute)}${entry.isCriticalPath ? '\n⚡ Critical Path' : ''}`}
                        >
                          {showLabel && (
                            <span className="text-[9px] text-white/90 font-medium px-1 truncate">
                              {formatTime(duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom time axis */}
        <div className="mt-1">
          <TimeAxis ticks={ticks} totalDuration={totalDuration} />
        </div>
    </div>
  );
}

// ── Phase Card ─────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: SimulationPhase;
  expanded: boolean;
  onToggle: () => void;
}

function PhaseCard({ phase, expanded, onToggle }: PhaseCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {/* Collapsed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="info">Phase {phase.number}</Badge>
          <h3 className="text-base font-semibold text-white">{phase.name}</h3>
          {phase.hasCheckpoint && (
            <span className="text-amber-400" title="CEO Checkpoint">&#9733;</span>
          )}
          {phase.isParallel && (
            <Badge variant="success">Parallel</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{phase.tasks.length} tasks</span>
          <span className="text-sm text-slate-500">{formatTime(phase.parallelMinutes)}</span>
          <div className="flex -space-x-1.5">
            {phase.agents.map((agent, idx) => (
              <div
                key={idx}
                className={`w-7 h-7 rounded-full ${agentBgMap[agent] || 'bg-slate-500'} flex items-center justify-center text-white text-[10px] font-semibold border-2 border-slate-900`}
                title={agent}
              >
                {agent.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-3"
      >
        {expanded ? '\u25BC Collapse' : '\u25B6 Expand tasks & deliverables'}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-6 space-y-6">
          {/* Task Table */}
          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-sm font-semibold text-white mb-3">Tasks</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Task</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Agent</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {phase.tasks.map((task) => (
                    <tr key={task.id} className="even:bg-slate-900/50 odd:bg-slate-900 hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 text-xs text-slate-500">{task.id}</td>
                      <td className="px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                        {task.checkpoint && <span className="text-amber-400" title="Checkpoint">&#9733;</span>}
                        {task.name}
                      </td>
                      <td className={`px-3 py-2 text-sm font-medium ${agentColorMap[task.agent] || 'text-slate-400'}`}>{task.agent}</td>
                      <td className="px-3 py-2 text-xs">
                        <Badge variant={task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'default'}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatTime(task.estimatedMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deliverables */}
          {phase.tasks.some((t) => t.produces.length > 0) && (
            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-semibold text-white mb-3">Deliverables</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {phase.tasks.flatMap((task) =>
                  task.produces.map((p, idx) => (
                    <div key={`${task.id}-${idx}`} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={deliverableIconMap[p.type] ?? deliverableIconMap.file} />
                      </svg>
                      <span className="text-sm text-slate-300">{p.name}</span>
                      <Badge variant={p.type === 'document' ? 'info' : p.type === 'directory' ? 'warning' : 'default'}>
                        {p.type}
                      </Badge>
                    </div>
                  )),
                )}
              </div>
            </div>
          )}

          {/* Acceptance Criteria */}
          {phase.tasks.some((t) => t.acceptanceCriteria.length > 0) && (
            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-semibold text-white mb-3">Acceptance Criteria</h4>
              <div className="space-y-3">
                {phase.tasks
                  .filter((t) => t.acceptanceCriteria.length > 0)
                  .map((task) => (
                    <div key={task.id}>
                      <p className="text-xs text-slate-500 mb-1">{task.id}: {task.name}</p>
                      <ul className="space-y-1">
                        {task.acceptanceCriteria.map((criteria, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <svg className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {criteria}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-64 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-96 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="h-64 bg-slate-800 rounded-xl mb-8" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
    </div>
  );
}
