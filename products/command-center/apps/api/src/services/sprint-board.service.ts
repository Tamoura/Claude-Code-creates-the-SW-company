import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface SprintTask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'done';
  assignee: string;
  product: string;
  sprint: string;
}

export interface OrchestratorState {
  products: Record<string, OrchestratorProduct>;
  lastUpdated: string;
}

export interface OrchestratorProduct {
  path: string;
  status: string;
  phase: string;
  apps: string[];
  notes: string;
}

export interface SprintBoard {
  tasks: SprintTask[];
  orchestratorState: OrchestratorState | null;
}

/** Cache with 30s TTL */
let cache: { data: SprintBoard; ts: number } | null = null;
const CACHE_TTL = 30_000;

export function getSprintBoard(): SprintBoard {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const tasks = loadAllTasks();
  const orchestratorState = loadOrchestratorState();

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
        sprint: currentSprint,
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

function loadOrchestratorState(): OrchestratorState | null {
  const statePath = repoPath('.claude', 'orchestrator', 'state.yml');
  if (!existsSync(statePath)) return null;

  try {
    const content = readFileSync(statePath, 'utf-8');
    return parseSimpleYaml(content);
  } catch {
    return null;
  }
}

function parseSimpleYaml(content: string): OrchestratorState {
  const products: Record<string, OrchestratorProduct> = {};
  let lastUpdated = '';

  const lines = content.split('\n');
  let currentProduct = '';
  let inProducts = false;

  for (const line of lines) {
    if (line.startsWith('last_updated:')) {
      const match = line.match(/last_updated:\s*"?([^"]+)"?/);
      if (match) lastUpdated = match[1].trim();
      continue;
    }

    if (line === 'products:') {
      inProducts = true;
      continue;
    }

    if (inProducts && /^\s{2}\w/.test(line) && line.includes(':')) {
      const name = line.trim().replace(':', '');
      currentProduct = name;
      products[name] = { path: '', status: '', phase: '', apps: [], notes: '' };
      continue;
    }

    if (inProducts && currentProduct && /^\s{4}\w/.test(line)) {
      const kvMatch = line.match(/^\s{4}(\w+):\s*"?(.+?)"?\s*$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const val = kvMatch[2];
        const prod = products[currentProduct];
        if (key === 'path') prod.path = val;
        else if (key === 'status') prod.status = val;
        else if (key === 'phase') prod.phase = val;
        else if (key === 'notes') prod.notes = val;
        else if (key === 'apps') {
          const appsMatch = val.match(/\[(.+)]/);
          if (appsMatch) {
            prod.apps = appsMatch[1].split(',').map((s) => s.trim());
          }
        }
      }
    }

    // Stop parsing products when we hit a non-indented, non-empty line
    if (inProducts && currentProduct && /^\w/.test(line) && line.trim() !== '') {
      inProducts = false;
      currentProduct = '';
    }
  }

  return { products, lastUpdated };
}
