import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { repoPath } from './repo.service.js';

// ── Types ──────────────────────────────────────────────────────────────

interface RawProduces {
  name: string;
  type: string;
  path: string;
}

interface RawTask {
  id: string;
  name: string;
  description?: string;
  agent: string;
  depends_on: string[];
  produces?: RawProduces[];
  parallel_ok: boolean;
  checkpoint: boolean;
  priority: string;
  estimated_time_minutes: number;
  acceptance_criteria?: string[];
  status: string;
}

interface RawYaml {
  metadata: { product: string; version: string; workflow_type: string };
  tasks: RawTask[];
}

export interface SimulationTask {
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

export interface SimulationPhase {
  number: number;
  name: string;
  tasks: SimulationTask[];
  totalMinutes: number;
  parallelMinutes: number;
  isParallel: boolean;
  hasCheckpoint: boolean;
  agents: string[];
}

export interface TimelineEntry {
  taskId: string;
  taskName: string;
  agent: string;
  startMinute: number;
  endMinute: number;
  phase: string;
  isCriticalPath: boolean;
}

export interface Deliverable {
  name: string;
  type: string;
  path: string;
}

export interface QualityGate {
  name: string;
  description: string;
  taskId: string;
}

export interface SimulationSummary {
  totalPhases: number;
  totalTasks: number;
  totalAgents: number;
  checkpointCount: number;
  sequentialMinutes: number;
  parallelMinutes: number;
  savingsPercent: number;
}

export interface SimulationResult {
  summary: SimulationSummary;
  phases: SimulationPhase[];
  timeline: TimelineEntry[];
  deliverables: Deliverable[];
  qualityGates: QualityGate[];
  mermaidDependency: string;
  mermaidGantt: string;
}

export interface WorkflowInfo {
  id: string;
  label: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const TEMPLATES_DIR = () => repoPath('.claude', 'workflows', 'templates');

function prettifyId(id: string): string {
  return id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Preferred display order for common workflows
const WORKFLOW_ORDER = [
  'new-product',
  'new-feature',
  'bug-fix',
  'hotfix',
  'release',
  'architecture-review',
  'security-audit',
  'prototype-first',
  'new-product-showcase',
  'new-mobile-app',
  'add-mobile-version',
  'mobile-app-store-release',
];

// ── Available Workflows ─────────────────────────────────────────────────

export function listAvailableWorkflows(): WorkflowInfo[] {
  const dir = TEMPLATES_DIR();
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith('-tasks.yml'));

  return files
    .map((f) => {
      const id = basename(f, '-tasks.yml');
      return { id, label: prettifyId(id) };
    })
    .sort((a, b) => {
      const ai = WORKFLOW_ORDER.indexOf(a.id);
      const bi = WORKFLOW_ORDER.indexOf(b.id);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.label.localeCompare(b.label);
    });
}

// ── YAML Parsing ─────────────────────────────────────────────────────────

function parseWorkflowYaml(id: string): { tasks: SimulationTask[]; raw: string; title: string } {
  const filePath = join(TEMPLATES_DIR(), `${id}-tasks.yml`);
  const content = readFileSync(filePath, 'utf-8');
  const parsed: RawYaml = parseYaml(content);

  const tasks: SimulationTask[] = (parsed.tasks ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: (t.description ?? '').trim(),
    agent: t.agent,
    dependsOn: t.depends_on ?? [],
    parallelOk: t.parallel_ok ?? false,
    checkpoint: t.checkpoint ?? false,
    priority: t.priority ?? 'normal',
    estimatedMinutes: t.estimated_time_minutes ?? 0,
    produces: (t.produces ?? []).map((p) => ({
      name: p.name,
      type: p.type,
      path: p.path,
    })),
    acceptanceCriteria: t.acceptance_criteria ?? [],
  }));

  return { tasks, raw: content, title: prettifyId(id) };
}

// ── Phase Grouping (line-position based — works for any YAML) ────────────

function groupIntoPhases(tasks: SimulationTask[], rawContent: string): SimulationPhase[] {
  const lines = rawContent.split('\n');

  // Find all "# PHASE X: Name" markers with their line numbers
  const phaseMarkers: Array<{ number: number; name: string; line: number }> = [];
  lines.forEach((line, idx) => {
    const match = line.match(/# PHASE (\d+):\s*(.+)/);
    if (match) {
      phaseMarkers.push({
        number: Number(match[1]),
        name: match[2].replace(/\s*\(.*\)/, '').trim(),
        line: idx,
      });
    }
  });

  // Fallback: no phase markers → single phase
  if (phaseMarkers.length === 0) {
    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const hasParallel = tasks.filter((t) => t.parallelOk).length > 1;
    const parallelMinutes = hasParallel
      ? Math.max(...tasks.map((t) => t.estimatedMinutes))
      : totalMinutes;
    return [
      {
        number: 1,
        name: 'All Tasks',
        tasks,
        totalMinutes,
        parallelMinutes,
        isParallel: hasParallel,
        hasCheckpoint: tasks.some((t) => t.checkpoint),
        agents: [...new Set(tasks.map((t) => t.agent))],
      },
    ];
  }

  // Find each task ID's line number in the raw file
  const taskLineMap = new Map<string, number>();
  lines.forEach((line, idx) => {
    // Matches:  - id: "BA-01"  or  - id: BA-01
    const match = line.match(/^\s*-\s*id:\s*["']?([^"'\s#]+)["']?/);
    if (match) {
      taskLineMap.set(match[1], idx);
    }
  });

  // Assign each task to the phase whose marker most recently precedes it
  const phaseAssignments = new Map<string, number>();
  for (const task of tasks) {
    const taskLine = taskLineMap.get(task.id) ?? 0;
    let assigned = phaseMarkers[0].number;
    for (const pm of phaseMarkers) {
      if (pm.line <= taskLine) assigned = pm.number;
    }
    phaseAssignments.set(task.id, assigned);
  }

  return phaseMarkers.map((pm) => {
    const phaseTasks = tasks.filter((t) => phaseAssignments.get(t.id) === pm.number);
    const totalMinutes = phaseTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const hasParallel = phaseTasks.filter((t) => t.parallelOk).length > 1;
    const parallelMinutes = hasParallel
      ? Math.max(...phaseTasks.map((t) => t.estimatedMinutes))
      : totalMinutes;
    return {
      number: pm.number,
      name: pm.name,
      tasks: phaseTasks,
      totalMinutes,
      parallelMinutes,
      isParallel: hasParallel,
      hasCheckpoint: phaseTasks.some((t) => t.checkpoint),
      agents: [...new Set(phaseTasks.map((t) => t.agent))],
    };
  });
}

// ── Critical Path ──────────────────────────────────────────────────────

function calculateTimeline(tasks: SimulationTask[], phases: SimulationPhase[]): TimelineEntry[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const earliestStart = new Map<string, number>();
  const earliestEnd = new Map<string, number>();

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const task of tasks) {
    inDegree.set(task.id, task.dependsOn.length);
    for (const dep of task.dependsOn) {
      const existing = adj.get(dep) ?? [];
      existing.push(task.id);
      adj.set(dep, existing);
    }
  }

  const queue: string[] = [];
  for (const task of tasks) {
    if (task.dependsOn.length === 0) {
      queue.push(task.id);
      earliestStart.set(task.id, 0);
      earliestEnd.set(task.id, task.estimatedMinutes);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const successors = adj.get(current) ?? [];
    for (const succ of successors) {
      const currentEnd = earliestEnd.get(current) ?? 0;
      const existingStart = earliestStart.get(succ) ?? 0;
      if (currentEnd > existingStart) {
        earliestStart.set(succ, currentEnd);
        const succTask = taskMap.get(succ)!;
        earliestEnd.set(succ, currentEnd + succTask.estimatedMinutes);
      }
      const newDegree = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, newDegree);
      if (newDegree === 0) queue.push(succ);
    }
  }

  const maxEnd = Math.max(...[...earliestEnd.values()], 0);
  const criticalSet = new Set<string>();

  function traceCritical(taskId: string) {
    criticalSet.add(taskId);
    const task = taskMap.get(taskId)!;
    for (const dep of task.dependsOn) {
      const depEnd = earliestEnd.get(dep) ?? 0;
      const taskStart = earliestStart.get(taskId) ?? 0;
      if (depEnd === taskStart) traceCritical(dep);
    }
  }

  for (const task of tasks) {
    if ((earliestEnd.get(task.id) ?? 0) === maxEnd) traceCritical(task.id);
  }

  const taskPhase = new Map<string, string>();
  for (const phase of phases) {
    for (const t of phase.tasks) taskPhase.set(t.id, phase.name);
  }

  return tasks
    .map((task) => ({
      taskId: task.id,
      taskName: task.name,
      agent: task.agent,
      startMinute: earliestStart.get(task.id) ?? 0,
      endMinute: earliestEnd.get(task.id) ?? 0,
      phase: taskPhase.get(task.id) ?? 'Unknown',
      isCriticalPath: criticalSet.has(task.id),
    }))
    .sort((a, b) => a.startMinute - b.startMinute);
}

// ── Mermaid Generation ─────────────────────────────────────────────────

const AGENT_CLASS_MAP: Record<string, string> = {
  'product-manager': 'pm',
  architect: 'arch',
  'backend-engineer': 'be',
  'frontend-engineer': 'fe',
  'qa-engineer': 'qa',
  'devops-engineer': 'devops',
  'technical-writer': 'docs',
  orchestrator: 'checkpoint',
  'business-analyst': 'ba',
  'code-reviewer': 'review',
  'security-engineer': 'sec',
  'performance-engineer': 'perf',
  'mobile-developer': 'mobile',
  'support-engineer': 'support',
  'ui-ux-designer': 'ux',
  'data-engineer': 'data',
  'innovation-specialist': 'innov',
  'product-strategist': 'strat',
};

const AGENT_ICON_MAP: Record<string, string> = {
  'product-manager': '\uD83D\uDCCB',
  architect: '\uD83C\uDFD7\uFE0F',
  'backend-engineer': '\u2699\uFE0F',
  'frontend-engineer': '\uD83C\uDFA8',
  'qa-engineer': '\uD83E\uDDEA',
  'devops-engineer': '\uD83D\uDE80',
  'technical-writer': '\uD83D\uDCDD',
  orchestrator: '\u2705',
  'business-analyst': '\uD83D\uDCC8',
  'code-reviewer': '\uD83D\uDD0D',
  'security-engineer': '\uD83D\uDD12',
  'performance-engineer': '\u26A1',
  'mobile-developer': '\uD83D\uDCF1',
  'support-engineer': '\uD83C\uDF9F\uFE0F',
  'ui-ux-designer': '\uD83C\uDFA8',
  'data-engineer': '\uD83D\uDDC4\uFE0F',
  'innovation-specialist': '\uD83D\uDCA1',
  'product-strategist': '\uD83E\uDDED',
};

const MERMAID_CLASS_DEFS = `
    classDef pm fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef arch fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef be fill:#059669,stroke:#047857,color:#fff
    classDef fe fill:#d97706,stroke:#b45309,color:#fff
    classDef qa fill:#dc2626,stroke:#b91c1c,color:#fff
    classDef devops fill:#0891b2,stroke:#0e7490,color:#fff
    classDef docs fill:#6366f1,stroke:#4f46e5,color:#fff
    classDef checkpoint fill:#f59e0b,stroke:#d97706,color:#000
    classDef ba fill:#ec4899,stroke:#db2777,color:#fff
    classDef review fill:#f43f5e,stroke:#e11d48,color:#fff
    classDef sec fill:#ef4444,stroke:#dc2626,color:#fff
    classDef perf fill:#84cc16,stroke:#65a30d,color:#000
    classDef mobile fill:#f97316,stroke:#ea580c,color:#fff
    classDef support fill:#10b981,stroke:#059669,color:#fff
    classDef ux fill:#d946ef,stroke:#c026d3,color:#fff
    classDef data fill:#14b8a6,stroke:#0d9488,color:#fff
    classDef innov fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef strat fill:#0ea5e9,stroke:#0284c7,color:#fff`;

function generateDependencyDiagram(tasks: SimulationTask[]): string {
  const lines: string[] = ['graph TD'];
  const idSet = new Set(tasks.map((t) => t.id));

  for (const task of tasks) {
    const cls = AGENT_CLASS_MAP[task.agent] ?? 'docs';
    const icon = AGENT_ICON_MAP[task.agent] ?? '\uD83D\uDCCC';
    const label = `${icon} ${task.name}<br/><i>${task.agent}</i>`;
    lines.push(`    ${task.id}["${label}"]:::${cls}`);
  }

  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (idSet.has(dep)) lines.push(`    ${dep} --> ${task.id}`);
    }
  }

  lines.push(MERMAID_CLASS_DEFS);
  return lines.join('\n');
}

function sanitizeGanttId(id: string): string {
  return id.replace(/[-{}.]/g, '_').toLowerCase();
}

function generateGantt(timeline: TimelineEntry[], phases: SimulationPhase[], title = 'Workflow Timeline'): string {
  const taskMap = new Map(phases.flatMap((p) => p.tasks).map((t) => [t.id, t]));

  const lines: string[] = [
    'gantt',
    '    dateFormat YYYY-MM-DDTHH:mm',
    '    axisFormat %H:%M',
    `    title ${title} Timeline`,
    '',
  ];

  const base = '2024-01-01T';
  function toTime(minutes: number): string {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${base}${h}:${m}`;
  }

  for (const phase of phases) {
    const sectionName = `Phase ${phase.number} - ${phase.name.replace(/&/g, 'and')}`;
    lines.push(`    section ${sectionName}`);
    const phaseTasks = timeline.filter((t) => t.phase === phase.name);
    for (const entry of phaseTasks) {
      const ganttId = sanitizeGanttId(entry.taskId);
      const critMarker = entry.isCriticalPath ? 'crit, ' : '';
      const task = taskMap.get(entry.taskId);
      const deps = task?.dependsOn ?? [];
      const duration = Math.max(entry.endMinute - entry.startMinute, 1);

      if (deps.length > 0) {
        const afterClause = `after ${deps.map(sanitizeGanttId).join(' ')}`;
        lines.push(`    ${entry.taskName} :${critMarker}${ganttId}, ${afterClause}, ${duration}m`);
      } else {
        lines.push(`    ${entry.taskName} :${critMarker}${ganttId}, ${toTime(entry.startMinute)}, ${duration}m`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main Build ─────────────────────────────────────────────────────────

function buildSimulation(id: string): SimulationResult {
  const { tasks, raw, title } = parseWorkflowYaml(id);
  const phases = groupIntoPhases(tasks, raw);
  const timeline = calculateTimeline(tasks, phases);

  const sequentialMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const parallelMinutes = Math.max(...timeline.map((t) => t.endMinute), 0);
  const savingsPercent =
    sequentialMinutes > 0
      ? Math.round(((sequentialMinutes - parallelMinutes) / sequentialMinutes) * 100)
      : 0;

  const allDeliverables: Deliverable[] = tasks.flatMap((t) =>
    t.produces.map((p) => ({ name: p.name, type: p.type, path: p.path })),
  );

  const qualityGates: QualityGate[] = tasks
    .filter((t) => t.checkpoint || t.id.startsWith('QA'))
    .map((t) => ({
      name: t.name,
      description: t.description,
      taskId: t.id,
    }));

  return {
    summary: {
      totalPhases: phases.length,
      totalTasks: tasks.length,
      totalAgents: new Set(tasks.map((t) => t.agent)).size,
      checkpointCount: tasks.filter((t) => t.checkpoint).length,
      sequentialMinutes,
      parallelMinutes,
      savingsPercent,
    },
    phases,
    timeline,
    deliverables: allDeliverables,
    qualityGates,
    mermaidDependency: generateDependencyDiagram(tasks),
    mermaidGantt: generateGantt(timeline, phases, title),
  };
}

// ── Public Exports ────────────────────────────────────────────────────

export function getSimulation(type: string): SimulationResult {
  return buildSimulation(type);
}

/** @deprecated use getSimulation('new-product') */
export function getNewProductSimulation(): SimulationResult {
  return buildSimulation('new-product');
}
