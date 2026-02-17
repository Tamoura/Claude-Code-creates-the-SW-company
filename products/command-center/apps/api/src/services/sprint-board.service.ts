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

function parseTasksMarkdown(content: string, product: string): SprintTask[] {
  const tasks: SprintTask[] = [];
  const lines = content.split('\n');
  let currentSprint = '';

  for (const line of lines) {
    // Detect sprint headers: ### Sprint P.1: ...
    const sprintMatch = line.match(/^###\s+(.+)/);
    if (sprintMatch) {
      currentSprint = sprintMatch[1].trim();
      continue;
    }

    // Parse table rows: | TASK-ID | Title | Agent | ... |
    const tableMatch = line.match(
      /^\|\s*([A-Z]+-\d+)\s*\|\s*(.+?)\s*\|\s*(\w[\w\s]*?)\s*\|/,
    );
    if (tableMatch) {
      const id = tableMatch[1];
      const title = tableMatch[2].trim();
      const assignee = tableMatch[3].trim();

      tasks.push({
        id,
        title,
        status: inferStatus(line),
        assignee,
        product,
        priority: inferPriority(line),
      });
    }
  }

  return tasks;
}

function inferStatus(line: string): 'pending' | 'in-progress' | 'done' {
  const lower = line.toLowerCase();
  if (lower.includes('~~') || lower.includes('done') || lower.includes('[x]')) {
    return 'done';
  }
  if (lower.includes('in-progress') || lower.includes('wip') || lower.includes('[~]')) {
    return 'in-progress';
  }
  return 'pending';
}

function inferPriority(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('critical') || lower.includes('p0') || lower.includes('urgent')) return 'high';
  if (lower.includes('high') || lower.includes('p1')) return 'high';
  if (lower.includes('low') || lower.includes('p3')) return 'low';
  return 'medium';
}

function buildOrchestratorResponse(): OrchestratorStateResponse {
  const statePath = repoPath('.claude', 'orchestrator', 'state.yml');
  if (!existsSync(statePath)) return {};

  try {
    const content = readFileSync(statePath, 'utf-8');

    // Extract current_task / active_product from YAML
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

    // If no explicit fields, try to infer from products with "active" status
    if (!activeProduct) {
      const activeMatch = content.match(/(\w[\w-]*):\s*\n\s+.*status:\s*"?active"?/m);
      if (activeMatch) activeProduct = activeMatch[1];
    }

    return { currentTask, activeProduct };
  } catch {
    return {};
  }
}
