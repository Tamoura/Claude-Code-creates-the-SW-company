import { readFileSync } from 'node:fs';
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
  consumes?: Array<{ name: string; required_from_task: string }>;
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

// ── YAML Parsing ───────────────────────────────────────────────────────

function parseNewProductYaml(): { tasks: SimulationTask[]; raw: string } {
  const filePath = repoPath(
    '.claude',
    'workflows',
    'templates',
    'new-product-tasks.yml',
  );
  const content = readFileSync(filePath, 'utf-8');
  const parsed: RawYaml = parseYaml(content);

  const tasks: SimulationTask[] = parsed.tasks.map((t) => ({
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

  return { tasks, raw: content };
}

// ── Phase Grouping ─────────────────────────────────────────────────────

function groupIntoPhases(
  tasks: SimulationTask[],
  rawContent: string,
): SimulationPhase[] {
  // Extract phase markers from comments
  const phaseRegex = /# PHASE (\d+): (.+)/g;
  const phaseMarkers: Array<{ number: number; name: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = phaseRegex.exec(rawContent)) !== null) {
    phaseMarkers.push({
      number: Number(match[1]),
      name: match[2].replace(/\s*\(.*\)/, '').trim(),
    });
  }

  // Also check for the CHECKPOINT marker as implicit final phase extension
  const checkpointMatch = rawContent.match(
    /# CHECKPOINT: (.+?)[\r\n]/,
  );

  // Assign tasks to phases based on their position in the YAML
  const taskIds = tasks.map((t) => t.id);
  const phaseAssignments: Map<string, number> = new Map();

  // Derive phase assignment from task ID prefix patterns
  for (const task of tasks) {
    if (task.id.startsWith('PRD')) phaseAssignments.set(task.id, 1);
    else if (task.id.startsWith('ARCH')) phaseAssignments.set(task.id, 2);
    else if (
      task.id.startsWith('DEVOPS') ||
      task.id.startsWith('BACKEND') ||
      task.id.startsWith('FRONTEND')
    )
      phaseAssignments.set(task.id, 3);
    else if (
      task.id.startsWith('QA') ||
      task.id.startsWith('DOCS') ||
      task.id.startsWith('CHECKPOINT')
    )
      phaseAssignments.set(task.id, 4);
  }

  const phases: SimulationPhase[] = phaseMarkers.map((pm) => {
    const phaseTasks = tasks.filter(
      (t) => phaseAssignments.get(t.id) === pm.number,
    );
    const totalMinutes = phaseTasks.reduce(
      (sum, t) => sum + t.estimatedMinutes,
      0,
    );
    const hasParallelTasks =
      phaseTasks.filter((t) => t.parallelOk).length > 1;
    const parallelMinutes = hasParallelTasks
      ? Math.max(...phaseTasks.map((t) => t.estimatedMinutes))
      : totalMinutes;

    return {
      number: pm.number,
      name: pm.name,
      tasks: phaseTasks,
      totalMinutes,
      parallelMinutes,
      isParallel: hasParallelTasks,
      hasCheckpoint: phaseTasks.some((t) => t.checkpoint),
      agents: [...new Set(phaseTasks.map((t) => t.agent))],
    };
  });

  return phases;
}

// ── Critical Path ──────────────────────────────────────────────────────

function calculateTimeline(
  tasks: SimulationTask[],
  phases: SimulationPhase[],
): TimelineEntry[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const earliestStart = new Map<string, number>();
  const earliestEnd = new Map<string, number>();

  // Topological sort via Kahn's algorithm
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
      if (newDegree === 0) {
        queue.push(succ);
      }
    }
  }

  // Find critical path: trace back from the task with the maximum end time
  const maxEnd = Math.max(...[...earliestEnd.values()]);
  const criticalSet = new Set<string>();

  // Walk backwards: a task is on the critical path if its end equals
  // the max-end among its successors' requirements
  function traceCritical(taskId: string) {
    criticalSet.add(taskId);
    const task = taskMap.get(taskId)!;
    for (const dep of task.dependsOn) {
      const depEnd = earliestEnd.get(dep) ?? 0;
      const taskStart = earliestStart.get(taskId) ?? 0;
      if (depEnd === taskStart) {
        traceCritical(dep);
      }
    }
  }

  // Start from all tasks that end at maxEnd
  for (const task of tasks) {
    if ((earliestEnd.get(task.id) ?? 0) === maxEnd) {
      traceCritical(task.id);
    }
  }

  // Build phase lookup
  const taskPhase = new Map<string, string>();
  for (const phase of phases) {
    for (const t of phase.tasks) {
      taskPhase.set(t.id, phase.name);
    }
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
};

const MERMAID_CLASS_DEFS = `
    classDef pm fill:#7c3aed,stroke:#5b21b6,color:#fff
    classDef arch fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef be fill:#059669,stroke:#047857,color:#fff
    classDef fe fill:#d97706,stroke:#b45309,color:#fff
    classDef qa fill:#dc2626,stroke:#b91c1c,color:#fff
    classDef devops fill:#0891b2,stroke:#0e7490,color:#fff
    classDef docs fill:#6366f1,stroke:#4f46e5,color:#fff
    classDef checkpoint fill:#f59e0b,stroke:#d97706,color:#000`;

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
      if (idSet.has(dep)) {
        lines.push(`    ${dep} --> ${task.id}`);
      }
    }
  }

  lines.push(MERMAID_CLASS_DEFS);
  return lines.join('\n');
}

function sanitizeGanttId(id: string): string {
  return id.replace(/-/g, '_').toLowerCase();
}

function generateGantt(
  timeline: TimelineEntry[],
  phases: SimulationPhase[],
): string {
  const lines: string[] = [
    'gantt',
    '    dateFormat X',
    '    axisFormat %H:%M',
    '    title New Product Creation Timeline',
    '',
  ];

  for (const phase of phases) {
    lines.push(`    section Phase ${phase.number}: ${phase.name}`);
    const phaseTasks = timeline.filter((t) => t.phase === phase.name);
    for (const entry of phaseTasks) {
      const ganttId = sanitizeGanttId(entry.taskId);
      const critMarker = entry.isCriticalPath ? 'crit, ' : '';
      const deps = phases
        .flatMap((p) => p.tasks)
        .find((t) => t.id === entry.taskId)?.dependsOn;
      const afterClause =
        deps && deps.length > 0
          ? `after ${deps.map(sanitizeGanttId).join(' ')}, `
          : '';
      lines.push(
        `    ${entry.taskName} :${critMarker}${ganttId}, ${afterClause}${entry.startMinute}, ${entry.endMinute}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main Export ─────────────────────────────────────────────────────────

export function getNewProductSimulation(): SimulationResult {
  const { tasks, raw } = parseNewProductYaml();
  const phases = groupIntoPhases(tasks, raw);
  const timeline = calculateTimeline(tasks, phases);

  const sequentialMinutes = tasks.reduce(
    (sum, t) => sum + t.estimatedMinutes,
    0,
  );
  const parallelMinutes = Math.max(
    ...timeline.map((t) => t.endMinute),
    0,
  );
  const savingsPercent =
    sequentialMinutes > 0
      ? Math.round(
          ((sequentialMinutes - parallelMinutes) / sequentialMinutes) * 100,
        )
      : 0;

  const allDeliverables: Deliverable[] = tasks.flatMap((t) =>
    t.produces.map((p) => ({ name: p.name, type: p.type, path: p.path })),
  );

  const qualityGates: QualityGate[] = [];
  for (const task of tasks) {
    if (task.checkpoint) {
      qualityGates.push({
        name: task.name,
        description: task.description,
        taskId: task.id,
      });
    }
    if (task.id.startsWith('QA')) {
      qualityGates.push({
        name: task.name,
        description: task.description,
        taskId: task.id,
      });
    }
  }

  const uniqueAgents = new Set(tasks.map((t) => t.agent));

  return {
    summary: {
      totalPhases: phases.length,
      totalTasks: tasks.length,
      totalAgents: uniqueAgents.size,
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
    mermaidGantt: generateGantt(timeline, phases),
  };
}
