import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { repoPath } from './repo.service.js';

export interface WorkflowTask {
  id: string;
  name: string;
  agent: string;
  dependsOn: string[];
  parallelOk: boolean;
  checkpoint: boolean;
  priority: string;
  estimatedMinutes: number;
}

export interface WorkflowTemplate {
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

const AGENT_CLASS_MAP: Record<string, string> = {
  'product-manager': 'pm',
  'architect': 'arch',
  'backend-engineer': 'be',
  'frontend-engineer': 'fe',
  'qa-engineer': 'qa',
  'devops-engineer': 'devops',
  'technical-writer': 'docs',
  'orchestrator': 'checkpoint',
  'support-engineer': 'qa',
  'security-engineer': 'devops',
  'ui-ux-designer': 'fe',
  'mobile-developer': 'fe',
};

const AGENT_ICON_MAP: Record<string, string> = {
  'product-manager': '\ud83d\udccb',
  'architect': '\ud83c\udfd7\ufe0f',
  'backend-engineer': '\u2699\ufe0f',
  'frontend-engineer': '\ud83c\udfa8',
  'qa-engineer': '\ud83e\uddea',
  'devops-engineer': '\ud83d\ude80',
  'technical-writer': '\ud83d\udcdd',
  'orchestrator': '\u2705',
  'support-engineer': '\ud83d\udee0\ufe0f',
  'security-engineer': '\ud83d\udd12',
  'ui-ux-designer': '\ud83c\udfa8',
  'mobile-developer': '\ud83d\udcf1',
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

/** Parse a single workflow YAML file into a WorkflowTemplate */
function parseWorkflowFile(filename: string): WorkflowTemplate | null {
  const filePath = repoPath('.claude', 'workflows', 'templates', filename);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const id = filename.replace(/\.ya?ml$/, '');

  // Extract metadata
  let workflowType = id;
  const wtMatch = content.match(/workflow_type:\s*"?([^"\n]+)"?/);
  if (wtMatch) workflowType = wtMatch[1].trim();

  // Extract description from first comment line or metadata
  const descMatch = content.match(/^#\s+(.+)/m);
  const description = descMatch ? descMatch[1].trim() : id.split('-').join(' ');

  // Parse tasks by finding `- id:` markers
  const tasks: WorkflowTask[] = [];
  const phases: string[] = [];
  let currentTask: Partial<WorkflowTask> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract phase names from comment markers
    const phaseMatch = line.match(/^  #\s+PHASE\s+\d+:\s+(.+)/);
    if (phaseMatch) {
      const phaseName = phaseMatch[1].replace(/\s*\(.*\)/, '').trim();
      if (!phases.includes(phaseName)) phases.push(phaseName);
      continue;
    }

    // Start of a new task
    const idMatch = line.match(/^\s+-\s+id:\s*"?([^"\n]+)"?/);
    if (idMatch) {
      if (currentTask?.id) tasks.push(finalizeTask(currentTask));
      currentTask = { id: idMatch[1].trim() };
      continue;
    }

    if (!currentTask) continue;

    const nameMatch = line.match(/^\s+name:\s*"?([^"\n]+)"?/);
    if (nameMatch) { currentTask.name = nameMatch[1].trim(); continue; }

    const agentMatch = line.match(/^\s+agent:\s*"?([^"\n]+)"?/);
    if (agentMatch) { currentTask.agent = agentMatch[1].trim(); continue; }

    const parallelMatch = line.match(/^\s+parallel_ok:\s*(true|false)/);
    if (parallelMatch) { currentTask.parallelOk = parallelMatch[1] === 'true'; continue; }

    const checkpointMatch = line.match(/^\s+checkpoint:\s*(true|false)/);
    if (checkpointMatch) { currentTask.checkpoint = checkpointMatch[1] === 'true'; continue; }

    const priorityMatch = line.match(/^\s+priority:\s*"?([^"\n]+)"?/);
    if (priorityMatch) { currentTask.priority = priorityMatch[1].trim(); continue; }

    const timeMatch = line.match(/^\s+estimated_time_minutes:\s*(\d+)/);
    if (timeMatch) { currentTask.estimatedMinutes = Number(timeMatch[1]); continue; }

    const depsMatch = line.match(/^\s+depends_on:\s*\[([^\]]*)\]/);
    if (depsMatch) {
      const raw = depsMatch[1].trim();
      currentTask.dependsOn = raw
        ? raw.split(',').map((d) => d.trim().replace(/"/g, ''))
        : [];
    }
  }

  // Push last task
  if (currentTask?.id) tasks.push(finalizeTask(currentTask));

  const agents = [...new Set(tasks.map((t) => t.agent))];
  const estimatedMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  // Derive a human-friendly name
  const name = id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const mermaid = generateMermaid(tasks);

  return {
    id,
    name,
    workflowType,
    description,
    taskCount: tasks.length,
    estimatedMinutes,
    phases,
    agents,
    tasks,
    mermaid,
  };
}

function finalizeTask(partial: Partial<WorkflowTask>): WorkflowTask {
  return {
    id: partial.id ?? 'UNKNOWN',
    name: partial.name ?? partial.id ?? 'Unnamed',
    agent: partial.agent ?? 'orchestrator',
    dependsOn: partial.dependsOn ?? [],
    parallelOk: partial.parallelOk ?? false,
    checkpoint: partial.checkpoint ?? false,
    priority: partial.priority ?? 'normal',
    estimatedMinutes: partial.estimatedMinutes ?? 0,
  };
}

function generateMermaid(tasks: WorkflowTask[]): string {
  const lines: string[] = ['graph TD'];

  for (const task of tasks) {
    const cls = AGENT_CLASS_MAP[task.agent] ?? 'docs';
    const icon = AGENT_ICON_MAP[task.agent] ?? '\ud83d\udccc';
    const label = `${icon} ${task.name}<br/><i>${task.agent}</i>`;
    lines.push(`    ${task.id}["${label}"]:::${cls}`);
  }

  // Add edges
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      lines.push(`    ${dep} --> ${task.id}`);
    }
  }

  lines.push(MERMAID_CLASS_DEFS);
  return lines.join('\n');
}

/** Build the hardcoded Orchestrator Flow workflow */
function buildOrchestratorFlow(): WorkflowTemplate {
  const mermaid = `graph TD
    CEO["\ud83c\udfaf CEO Request"] --> ORCH["\ud83d\udd04 Orchestrator"]
    ORCH --> ASSESS["\ud83d\udcca Assess State"]
    ASSESS --> PLAN["\ud83d\udccb Plan Tasks"]
    PLAN --> DELEGATE["\ud83d\udc65 Delegate to Agents"]
    DELEGATE --> MONITOR["\ud83d\udce1 Monitor Progress"]
    MONITOR --> GATE["\ud83d\udd12 Quality Gate"]
    GATE -->|PASS| CHECKPOINT["\u2705 CEO Checkpoint"]
    GATE -->|FAIL| FIX["\ud83d\udd27 Fix & Retry"]
    FIX --> GATE
    CHECKPOINT --> DONE["\ud83d\ude80 Deliver"]`;

  return {
    id: 'orchestrator-flow',
    name: 'Orchestrator Flow',
    workflowType: 'orchestrator',
    description: 'How the Orchestrator processes CEO requests end-to-end',
    taskCount: 8,
    estimatedMinutes: 0,
    phases: ['Request', 'Planning', 'Execution', 'Delivery'],
    agents: ['orchestrator'],
    tasks: [],
    mermaid,
  };
}

/** Build the hardcoded Quality Gate Pipeline workflow */
function buildQualityGatePipeline(): WorkflowTemplate {
  const mermaid = `graph LR
    CODE["\ud83d\udcbb Code Complete"] --> UNIT["\ud83e\uddea Unit Tests"]
    UNIT --> INT["\ud83d\udd17 Integration Tests"]
    INT --> E2E["\ud83c\udf10 E2E Tests"]
    E2E --> BUILD["\ud83d\udce6 Build Check"]
    BUILD --> AUDIT["\ud83d\udccb Audit Gate"]
    AUDIT -->|"All >= 8/10"| PASS["\u2705 PASS"]
    AUDIT -->|"Any < 8/10"| IMPROVE["\ud83d\udd27 Improve"]
    IMPROVE --> AUDIT`;

  return {
    id: 'quality-gate-pipeline',
    name: 'Quality Gate Pipeline',
    workflowType: 'quality-gate',
    description: 'The multi-stage quality verification pipeline before CEO delivery',
    taskCount: 7,
    estimatedMinutes: 0,
    phases: ['Testing', 'Build', 'Audit'],
    agents: ['qa-engineer', 'devops-engineer'],
    tasks: [],
    mermaid,
  };
}

/** List all workflow templates plus hardcoded workflows */
export function listWorkflows(): WorkflowTemplate[] {
  const templatesDir = repoPath('.claude', 'workflows', 'templates');
  const workflows: WorkflowTemplate[] = [];

  if (existsSync(templatesDir)) {
    const files = readdirSync(templatesDir).filter(
      (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
    );
    for (const file of files) {
      const wf = parseWorkflowFile(file);
      if (wf) workflows.push(wf);
    }
  }

  // Add hardcoded workflows
  workflows.push(buildOrchestratorFlow());
  workflows.push(buildQualityGatePipeline());

  return workflows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Get a single workflow by ID */
export function getWorkflow(id: string): WorkflowTemplate | null {
  return listWorkflows().find((w) => w.id === id) ?? null;
}
