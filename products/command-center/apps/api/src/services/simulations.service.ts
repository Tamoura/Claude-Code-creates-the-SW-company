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
  title = 'New Product Creation Timeline',
): string {
  const taskMap = new Map(
    phases.flatMap((p) => p.tasks).map((t) => [t.id, t]),
  );

  const lines: string[] = [
    'gantt',
    '    dateFormat YYYY-MM-DDTHH:mm',
    '    axisFormat %H:%M',
    `    title ${title} Timeline`,
    '',
  ];

  // Convert minutes offset to ISO datetime from a base date
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
        lines.push(
          `    ${entry.taskName} :${critMarker}${ganttId}, ${afterClause}, ${duration}m`,
        );
      } else {
        lines.push(
          `    ${entry.taskName} :${critMarker}${ganttId}, ${toTime(entry.startMinute)}, ${duration}m`,
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Workflow Type Definitions ───────────────────────────────────────────

export type WorkflowType = 'new-product' | 'new-feature' | 'bug-fix' | 'architecture-review' | 'security-audit';

interface InlineTask {
  id: string;
  name: string;
  agent: string;
  dependsOn: string[];
  parallelOk: boolean;
  checkpoint: boolean;
  priority: string;
  estimatedMinutes: number;
  produces: Array<{ name: string; type: string; path: string }>;
  acceptanceCriteria: string[];
  description: string;
}

interface WorkflowDefinition {
  title: string;
  phases: Array<{ number: number; name: string }>;
  taskPhaseMap: Record<string, number>;
  tasks: InlineTask[];
}

const WORKFLOW_DEFINITIONS: Record<Exclude<WorkflowType, 'new-product'>, WorkflowDefinition> = {
  'new-feature': {
    title: 'New Feature',
    phases: [
      { number: 1, name: 'Analysis' },
      { number: 2, name: 'Specification' },
      { number: 3, name: 'Implementation' },
      { number: 4, name: 'Quality & Delivery' },
    ],
    taskPhaseMap: {
      'BA-01': 1,
      'SPEC-01': 2,
      'CLARIFY-01': 2,
      'ARCH-01': 2,
      'BE-01': 3,
      'FE-01': 3,
      'QA-01': 4,
      'REVIEW-01': 4,
      'DOCS-01': 4,
    },
    tasks: [
      { id: 'BA-01', name: 'Business Analysis', agent: 'business-analyst', dependsOn: [], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 30, produces: [{ name: 'Business Analysis Report', type: 'document', path: 'docs/specs/ba-analysis.md' }], acceptanceCriteria: ['Stakeholder needs documented', 'Gap analysis complete'], description: 'Analyze business requirements and stakeholder needs' },
      { id: 'SPEC-01', name: 'Feature Specification', agent: 'product-manager', dependsOn: ['BA-01'], parallelOk: false, checkpoint: true, priority: 'high', estimatedMinutes: 45, produces: [{ name: 'Feature Spec', type: 'document', path: 'docs/specs/feature-spec.md' }], acceptanceCriteria: ['User stories complete', 'Acceptance criteria defined'], description: 'Create structured feature specification using spec-kit' },
      { id: 'CLARIFY-01', name: 'Spec Clarification', agent: 'product-manager', dependsOn: ['SPEC-01'], parallelOk: false, checkpoint: false, priority: 'medium', estimatedMinutes: 20, produces: [], acceptanceCriteria: ['Ambiguities resolved'], description: 'Resolve spec ambiguities with up to 5 clarifying questions' },
      { id: 'ARCH-01', name: 'Architecture Design', agent: 'architect', dependsOn: ['CLARIFY-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 60, produces: [{ name: 'Architecture Plan', type: 'document', path: 'docs/plan.md' }], acceptanceCriteria: ['C4 diagrams complete', 'ER diagram for schema changes'], description: 'Design architecture and create implementation plan' },
      { id: 'BE-01', name: 'Backend Implementation', agent: 'backend-engineer', dependsOn: ['ARCH-01'], parallelOk: true, checkpoint: false, priority: 'high', estimatedMinutes: 120, produces: [{ name: 'API Endpoints', type: 'file', path: 'apps/api/src/routes/' }], acceptanceCriteria: ['All endpoints implemented', 'Unit tests passing'], description: 'Implement backend API endpoints and business logic' },
      { id: 'FE-01', name: 'Frontend Implementation', agent: 'frontend-engineer', dependsOn: ['ARCH-01'], parallelOk: true, checkpoint: false, priority: 'high', estimatedMinutes: 120, produces: [{ name: 'UI Components', type: 'file', path: 'apps/web/src/pages/' }], acceptanceCriteria: ['UI matches spec', 'Component tests passing'], description: 'Implement frontend UI and connect to API' },
      { id: 'QA-01', name: 'Quality Assurance', agent: 'qa-engineer', dependsOn: ['BE-01', 'FE-01'], parallelOk: false, checkpoint: true, priority: 'critical', estimatedMinutes: 60, produces: [{ name: 'Test Suite', type: 'file', path: 'e2e/' }], acceptanceCriteria: ['E2E tests passing', 'Coverage >= 80%'], description: 'Run quality gates and generate E2E tests' },
      { id: 'REVIEW-01', name: 'Code Review', agent: 'code-reviewer', dependsOn: ['QA-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 30, produces: [{ name: 'Review Report', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['No critical issues', 'Security approved'], description: 'Audit code for quality, security, and standards compliance' },
      { id: 'DOCS-01', name: 'Documentation', agent: 'technical-writer', dependsOn: ['REVIEW-01'], parallelOk: false, checkpoint: false, priority: 'medium', estimatedMinutes: 30, produces: [{ name: 'Feature Docs', type: 'document', path: 'docs/' }], acceptanceCriteria: ['API docs updated', 'README updated'], description: 'Write comprehensive feature documentation' },
    ],
  },
  'bug-fix': {
    title: 'Bug Fix',
    phases: [
      { number: 1, name: 'Triage' },
      { number: 2, name: 'Investigation' },
      { number: 3, name: 'Fix & Verify' },
    ],
    taskPhaseMap: {
      'TRIAGE-01': 1,
      'REPRO-01': 2,
      'ROOT-01': 2,
      'FIX-01': 3,
      'TEST-01': 3,
      'REVIEW-01': 3,
      'DEPLOY-01': 3,
    },
    tasks: [
      { id: 'TRIAGE-01', name: 'Bug Triage', agent: 'support-engineer', dependsOn: [], parallelOk: false, checkpoint: false, priority: 'critical', estimatedMinutes: 15, produces: [{ name: 'Triage Report', type: 'document', path: 'notes/bugs/' }], acceptanceCriteria: ['Severity assessed', 'Assigned to engineer'], description: 'Assess bug severity and route to appropriate engineer' },
      { id: 'REPRO-01', name: 'Reproduce Bug', agent: 'qa-engineer', dependsOn: ['TRIAGE-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 20, produces: [{ name: 'Reproduction Steps', type: 'document', path: 'notes/bugs/' }], acceptanceCriteria: ['Bug reproducible', 'Steps documented'], description: 'Reliably reproduce the bug and document steps' },
      { id: 'ROOT-01', name: 'Root Cause Analysis', agent: 'backend-engineer', dependsOn: ['REPRO-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 30, produces: [], acceptanceCriteria: ['Root cause identified', 'Impact scope defined'], description: 'Identify root cause and scope of impact' },
      { id: 'FIX-01', name: 'Implement Fix', agent: 'backend-engineer', dependsOn: ['ROOT-01'], parallelOk: false, checkpoint: false, priority: 'critical', estimatedMinutes: 45, produces: [{ name: 'Bug Fix', type: 'file', path: 'apps/' }], acceptanceCriteria: ['Fix implemented', 'Regression test added'], description: 'Implement the minimal fix and add regression test' },
      { id: 'TEST-01', name: 'Verify Fix', agent: 'qa-engineer', dependsOn: ['FIX-01'], parallelOk: false, checkpoint: true, priority: 'high', estimatedMinutes: 20, produces: [], acceptanceCriteria: ['Bug no longer reproducible', 'All tests passing'], description: 'Verify fix resolves the bug and no regressions introduced' },
      { id: 'REVIEW-01', name: 'Code Review', agent: 'code-reviewer', dependsOn: ['TEST-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 20, produces: [], acceptanceCriteria: ['Fix approved', 'No new issues introduced'], description: 'Review fix for correctness and code quality' },
      { id: 'DEPLOY-01', name: 'Deploy Fix', agent: 'devops-engineer', dependsOn: ['REVIEW-01'], parallelOk: false, checkpoint: true, priority: 'critical', estimatedMinutes: 20, produces: [], acceptanceCriteria: ['Deployed to production', 'Health checks passing'], description: 'Deploy fix and verify production health' },
    ],
  },
  'architecture-review': {
    title: 'Architecture Review',
    phases: [
      { number: 1, name: 'Scoping' },
      { number: 2, name: 'Assessment' },
      { number: 3, name: 'Proposal & Sign-off' },
    ],
    taskPhaseMap: {
      'SCOPE-01': 1,
      'CURRENT-01': 2,
      'GAPS-01': 2,
      'PERF-01': 2,
      'PROPOSE-01': 3,
      'REVIEW-01': 3,
      'ADR-01': 3,
    },
    tasks: [
      { id: 'SCOPE-01', name: 'Define Review Scope', agent: 'architect', dependsOn: [], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 20, produces: [{ name: 'Review Scope', type: 'document', path: 'docs/ADRs/' }], acceptanceCriteria: ['Scope defined', 'Review goals documented'], description: 'Define scope and goals of the architecture review' },
      { id: 'CURRENT-01', name: 'Document Current Architecture', agent: 'architect', dependsOn: ['SCOPE-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 60, produces: [{ name: 'As-Is Architecture', type: 'document', path: 'docs/ADRs/' }], acceptanceCriteria: ['C4 diagrams of current state', 'Data flows documented'], description: 'Create C4 diagrams and document current architecture state' },
      { id: 'GAPS-01', name: 'Security Gap Analysis', agent: 'security-engineer', dependsOn: ['CURRENT-01'], parallelOk: true, checkpoint: false, priority: 'high', estimatedMinutes: 45, produces: [{ name: 'Security Analysis', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['Security gaps identified', 'Risk ratings assigned'], description: 'Identify security gaps and vulnerabilities in current architecture' },
      { id: 'PERF-01', name: 'Performance Assessment', agent: 'performance-engineer', dependsOn: ['CURRENT-01'], parallelOk: true, checkpoint: false, priority: 'medium', estimatedMinutes: 45, produces: [{ name: 'Performance Report', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['Bottlenecks identified', 'Baseline metrics recorded'], description: 'Assess performance characteristics and identify bottlenecks' },
      { id: 'PROPOSE-01', name: 'Propose New Architecture', agent: 'architect', dependsOn: ['GAPS-01', 'PERF-01'], parallelOk: false, checkpoint: true, priority: 'high', estimatedMinutes: 90, produces: [{ name: 'To-Be Architecture', type: 'document', path: 'docs/ADRs/' }], acceptanceCriteria: ['New architecture documented', 'Before/after diagrams included'], description: 'Design and document proposed architecture improvements' },
      { id: 'REVIEW-01', name: 'Architecture Review', agent: 'code-reviewer', dependsOn: ['PROPOSE-01'], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 30, produces: [], acceptanceCriteria: ['Proposal reviewed', 'Trade-offs documented'], description: 'Review proposed architecture for correctness and trade-offs' },
      { id: 'ADR-01', name: 'Write ADRs', agent: 'technical-writer', dependsOn: ['REVIEW-01'], parallelOk: false, checkpoint: false, priority: 'medium', estimatedMinutes: 30, produces: [{ name: 'Architecture Decision Records', type: 'document', path: 'docs/ADRs/' }], acceptanceCriteria: ['ADRs written for each decision', 'Alternatives documented'], description: 'Document architecture decisions with context and consequences' },
    ],
  },
  'security-audit': {
    title: 'Security Audit',
    phases: [
      { number: 1, name: 'Planning' },
      { number: 2, name: 'Assessment' },
      { number: 3, name: 'Remediation' },
    ],
    taskPhaseMap: {
      'SCOPE-01': 1,
      'SCAN-01': 2,
      'PENTEST-01': 2,
      'DEPS-01': 2,
      'REPORT-01': 2,
      'REMEDIATE-01': 3,
      'VERIFY-01': 3,
    },
    tasks: [
      { id: 'SCOPE-01', name: 'Audit Scoping', agent: 'security-engineer', dependsOn: [], parallelOk: false, checkpoint: false, priority: 'high', estimatedMinutes: 20, produces: [{ name: 'Audit Scope Document', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['Scope boundaries defined', 'Attack surface mapped'], description: 'Define audit scope and identify attack surface' },
      { id: 'SCAN-01', name: 'Static Security Scan', agent: 'security-engineer', dependsOn: ['SCOPE-01'], parallelOk: true, checkpoint: false, priority: 'high', estimatedMinutes: 30, produces: [{ name: 'SAST Results', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['All files scanned', 'No critical findings unresolved'], description: 'Run static analysis security testing across codebase' },
      { id: 'PENTEST-01', name: 'Penetration Testing', agent: 'security-engineer', dependsOn: ['SCOPE-01'], parallelOk: true, checkpoint: false, priority: 'high', estimatedMinutes: 60, produces: [{ name: 'Pentest Results', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['Auth flows tested', 'Injection vectors tested'], description: 'Conduct penetration testing on API and auth flows' },
      { id: 'DEPS-01', name: 'Dependency Audit', agent: 'devops-engineer', dependsOn: ['SCOPE-01'], parallelOk: true, checkpoint: false, priority: 'medium', estimatedMinutes: 20, produces: [{ name: 'Dependency Report', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['All CVEs identified', 'Update plan created'], description: 'Audit npm dependencies for known vulnerabilities' },
      { id: 'REPORT-01', name: 'Security Report', agent: 'security-engineer', dependsOn: ['SCAN-01', 'PENTEST-01', 'DEPS-01'], parallelOk: false, checkpoint: true, priority: 'critical', estimatedMinutes: 45, produces: [{ name: 'Security Audit Report', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['All findings documented', 'Risk ratings assigned', 'Remediation plan included'], description: 'Compile comprehensive security audit report with findings' },
      { id: 'REMEDIATE-01', name: 'Remediate Findings', agent: 'backend-engineer', dependsOn: ['REPORT-01'], parallelOk: false, checkpoint: false, priority: 'critical', estimatedMinutes: 90, produces: [], acceptanceCriteria: ['Critical findings fixed', 'High findings fixed or mitigated'], description: 'Implement security fixes for all critical and high findings' },
      { id: 'VERIFY-01', name: 'Verify Remediation', agent: 'qa-engineer', dependsOn: ['REMEDIATE-01'], parallelOk: false, checkpoint: true, priority: 'high', estimatedMinutes: 30, produces: [{ name: 'Verification Report', type: 'document', path: 'docs/quality-reports/' }], acceptanceCriteria: ['All fixes verified', 'Re-test passed', 'Audit closed'], description: 'Verify all remediations are effective and audit is closed' },
    ],
  },
};

// ── Inline Workflow Builder ──────────────────────────────────────────────

function buildSimulationFromInline(
  workflowType: Exclude<WorkflowType, 'new-product'>,
): SimulationResult {
  const def = WORKFLOW_DEFINITIONS[workflowType];

  const tasks: SimulationTask[] = def.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    agent: t.agent,
    dependsOn: t.dependsOn,
    parallelOk: t.parallelOk,
    checkpoint: t.checkpoint,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    produces: t.produces,
    acceptanceCriteria: t.acceptanceCriteria,
  }));

  const phases: SimulationPhase[] = def.phases.map((pm) => {
    const phaseTasks = tasks.filter(
      (t) => def.taskPhaseMap[t.id] === pm.number,
    );
    const totalMinutes = phaseTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const hasParallelTasks = phaseTasks.filter((t) => t.parallelOk).length > 1;
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
    mermaidGantt: generateGantt(timeline, phases, def.title),
  };
}

// ── Main Exports ─────────────────────────────────────────────────────────

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

export function getSimulation(type: WorkflowType): SimulationResult {
  if (type === 'new-product') {
    return getNewProductSimulation();
  }
  return buildSimulationFromInline(type);
}
