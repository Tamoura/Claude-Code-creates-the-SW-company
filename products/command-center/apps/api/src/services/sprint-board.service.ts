import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface SprintTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'done';
  assignee: string;
  product: string;
  priority: string;
  phase?: string;
  description?: string;
}

export interface OrchestratorStateResponse {
  currentTask?: string;
  activeProduct?: string;
}

export interface SprintBoard {
  tasks: SprintTask[];
  orchestratorState: OrchestratorStateResponse;
}

/** Cache with 30s TTL */
let cache: { data: SprintBoard; ts: number } | null = null;
const CACHE_TTL = 30_000;

export function getSprintBoard(): SprintBoard {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const tasks = loadAllTasks();
  const orchestratorState = buildOrchestratorResponse();

  const data: SprintBoard = { tasks, orchestratorState };
  cache = { data, ts: Date.now() };
  return data;
}

function loadAllTasks(): SprintTask[] {
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const allTasks: SprintTask[] = [];
  const products = readdirSync(productsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const product of products) {
    const tasksPath = join(repoPath('products', product), 'docs', 'tasks.md');
    if (!existsSync(tasksPath)) continue;

    try {
      const content = readFileSync(tasksPath, 'utf-8');
      const parsed = parseTasksMarkdown(content, product);
      allTasks.push(...parsed);
    } catch { /* ignore */ }
  }

  return allTasks;
}

// ── ID validation ──────────────────────────────────────────────────────
// Matches: T001, T024, BA-01, SPEC-01, QA-01, PRO-01, ARCH-01, etc.
const TASK_ID_RE = /^([A-Z]{1,6}\d+[\w-]*)$/;

function isTaskId(s: string): boolean {
  return TASK_ID_RE.test(s.trim()) && !['PHASE', 'SPRINT', 'TASK', 'TITLE', 'NAME', 'STATUS', 'BRANCH'].includes(s.trim().toUpperCase());
}

// ── Status resolution ─────────────────────────────────────────────────

function resolveStatus(text: string): 'pending' | 'in-progress' | 'done' {
  const lower = text.toLowerCase();
  if (
    lower.includes('complete') ||
    lower.includes('done') ||
    lower === 'x' ||
    lower.includes('✅') ||
    lower.includes('~~')
  ) return 'done';
  if (
    lower.includes('in-progress') ||
    lower.includes('in progress') ||
    lower.includes('wip') ||
    lower.includes('active') ||
    lower === '~'
  ) return 'in-progress';
  return 'pending';
}

// ── Priority inference ────────────────────────────────────────────────

function resolvePriority(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('critical') || lower.includes('p0') || lower.includes('urgent')) return 'high';
  if (lower.includes('high') || lower.includes('p1')) return 'high';
  if (lower.includes('low') || lower.includes('p3')) return 'low';
  return 'medium';
}

// ── Assignee inference ────────────────────────────────────────────────
// Most tasks.md files don't have explicit agent columns, infer from backtick type

function resolveAssignee(line: string, product: string): string {
  // Check for explicit agent in backticks: `backend-engineer`, `qa-engineer` etc.
  const agentMatch = line.match(/`(backend-engineer|frontend-engineer|qa-engineer|devops-engineer|architect|product-manager|technical-writer|security-engineer|data-engineer|mobile-developer|orchestrator)`/);
  if (agentMatch) return agentMatch[1];

  // Infer from type prefix: `test` → qa-engineer, `feat` → engineer, `docs` → tech-writer, `fix` → engineer
  const typeMatch = line.match(/`(test|feat|fix|refactor|docs|chore)`/);
  if (typeMatch) {
    const type = typeMatch[1];
    if (type === 'test') return 'qa-engineer';
    if (type === 'docs') return 'technical-writer';
    return 'engineer';
  }

  return product;
}

// ── Title cleanup ─────────────────────────────────────────────────────

function cleanTitle(raw: string): string {
  return raw
    .replace(/`[^`]+`\s*/g, '')          // strip backtick spans
    .replace(/—\s*(FR|NFR|US|AC|EP|PR)-[\w,\s]+$/g, '') // strip traceability refs
    .replace(/\s*->\s*.+$/, '')           // strip file paths: -> path/to/file
    .replace(/\s*\[P\]\s*/g, '')          // strip [P] parallel markers
    .replace(/\*+/g, '')                  // strip bold markers
    .trim();
}

// ── Main parser — handles all 3 formats ──────────────────────────────

function parseTasksMarkdown(content: string, product: string): SprintTask[] {
  const tasks: SprintTask[] = [];
  const lines = content.split('\n');
  let currentPhase = '';

  // Track table header columns so we know which column is "Status"
  let statusColIndex = -1;

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Phase/Sprint headers: ## Phase 1: or ## Sprint 1.1:
    if (/^##\s+/.test(trimmed)) {
      currentPhase = trimmed.replace(/^#+\s+/, '').trim();
      statusColIndex = -1; // reset on new section
      continue;
    }

    // ── FORMAT 1: Checkbox bullet
    // Handles: - [x] **T001** `test` description
    //          - [ ] T001 description
    //          - [x] T024 description — FR-001
    const cbMatch = trimmed.match(/^-\s+\[([ xX~])\]\s+\*{0,2}([A-Z]+\d+[\w-]*)\*{0,2}\s*(.*)/);
    if (cbMatch) {
      const state = cbMatch[1].toLowerCase();
      const id = cbMatch[2];
      const rest = cbMatch[3];

      if (!isTaskId(id)) continue;

      const title = cleanTitle(rest) || id;

      tasks.push({
        id,
        title,
        status: state === 'x' ? 'done' : state === '~' ? 'in-progress' : 'pending',
        assignee: resolveAssignee(line, product),
        product,
        priority: resolvePriority(line),
        phase: currentPhase,
      });
      continue;
    }

    // ── FORMAT 2: Markdown table rows
    if (!trimmed.startsWith('|')) continue;

    const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const col0 = cells[0];
    const col1 = cells[1] ?? '';

    // Detect table header row — capture status column position
    if (col0 === '#' || col0.toLowerCase() === 'id' || col0.toLowerCase() === 'phase') {
      // Find which column has "Status" header
      statusColIndex = cells.findIndex((c) => c.toLowerCase() === 'status');
      continue;
    }

    // Skip separator rows (---)
    if (col0.startsWith('-') || col0.startsWith(':')) continue;

    // Skip summary tables (Phase | Tasks | Tests | ...)
    if (col1.toLowerCase() === 'tasks' || col1.toLowerCase() === 'tests') continue;

    // ID must match task pattern
    if (!isTaskId(col0)) continue;

    const id = col0;
    const title = col1.replace(/`/g, '').trim();
    if (!title || title.toLowerCase() === 'task' || title.toLowerCase() === 'title') continue;

    // Determine status: use header-detected column if available, else infer from all cells
    let statusText = '';
    if (statusColIndex > 0 && statusColIndex < cells.length) {
      statusText = cells[statusColIndex];
    } else {
      // Fallback: scan all cells for status keywords
      statusText = cells.slice(2).join(' ');
    }

    tasks.push({
      id,
      title,
      status: resolveStatus(statusText),
      assignee: resolveAssignee(line, product),
      product,
      priority: resolvePriority(line),
      phase: currentPhase,
    });
  }

  return tasks;
}

// ── Orchestrator state ────────────────────────────────────────────────

function buildOrchestratorResponse(): OrchestratorStateResponse {
  const statePath = repoPath('.claude', 'orchestrator', 'state.yml');
  if (!existsSync(statePath)) return {};

  try {
    const content = readFileSync(statePath, 'utf-8');

    let currentTask: string | undefined;
    let activeProduct: string | undefined;

    const taskMatch = content.match(/current_task:\s*"?(.+?)"?\s*$/m);
    if (taskMatch && taskMatch[1].trim() !== 'null' && taskMatch[1].trim() !== '~') {
      currentTask = taskMatch[1].trim();
    }

    const productMatch = content.match(/active_product:\s*"?(.+?)"?\s*$/m);
    if (productMatch && productMatch[1].trim() !== 'null' && productMatch[1].trim() !== '~') {
      activeProduct = productMatch[1].trim();
    }

    if (!activeProduct) {
      const activeMatch = content.match(/(\w[\w-]*):\s*\n\s+.*status:\s*"?active"?/m);
      if (activeMatch) activeProduct = activeMatch[1];
    }

    return { currentTask, activeProduct };
  } catch {
    return {};
  }
}
