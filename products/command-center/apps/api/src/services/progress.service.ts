import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { repoPath } from './repo.service.js';
import { productExists } from './products.service.js';

// --- Interfaces ---

export interface SprintTask {
  id: string;
  type: string;
  title: string;
  status: 'done' | 'in-progress' | 'pending';
  traceability: string;
}

export interface Sprint {
  name: string;
  status: 'complete' | 'in-progress' | 'future';
  tasks: SprintTask[];
  progress: { done: number; total: number; percent: number };
}

export interface UserStory {
  id: string;
  title: string;
  priority: string;
  persona: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  implemented: boolean;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: string;
  url: string;
}

export interface ProductProgress {
  product: string;
  sprints: Sprint[];
  stories: UserStory[];
  issues: GitHubIssue[];
  summary: {
    totalTasks: number;
    doneTasks: number;
    totalStories: number;
    implementedStories: number;
    openIssues: number;
    closedIssues: number;
  };
}

// --- Cache ---

const cache = new Map<string, { data: ProductProgress; ts: number }>();
const CACHE_TTL = 30_000;

// --- Public API ---

export function getProductProgress(name: string): ProductProgress | null {
  if (!productExists(name)) return null;

  const cached = cache.get(name);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const sprints = parseSprints(name);
  const stories = parseUserStories(name);
  const issues = fetchGitHubIssues(name);

  // Cross-reference: mark stories as implemented if all linked tasks are done
  const completedTraceIds = new Set<string>();
  for (const sprint of sprints) {
    for (const task of sprint.tasks) {
      if (task.status === 'done' && task.traceability) {
        for (const fr of task.traceability.split(',')) {
          completedTraceIds.add(fr.trim());
        }
      }
    }
  }

  for (const story of stories) {
    // A story is implemented if it has linked FR codes and all appear in completed tasks
    const storyFrs = extractFrCodes(story);
    if (storyFrs.length > 0) {
      story.implemented = storyFrs.every((fr) => completedTraceIds.has(fr));
    }
  }

  const totalTasks = sprints.reduce((sum, s) => sum + s.tasks.length, 0);
  const doneTasks = sprints.reduce(
    (sum, s) => sum + s.tasks.filter((t) => t.status === 'done').length,
    0,
  );

  const data: ProductProgress = {
    product: name,
    sprints,
    stories,
    issues,
    summary: {
      totalTasks,
      doneTasks,
      totalStories: stories.length,
      implementedStories: stories.filter((s) => s.implemented).length,
      openIssues: issues.filter((i) => i.state === 'open').length,
      closedIssues: issues.filter((i) => i.state === 'closed').length,
    },
  };

  cache.set(name, { data, ts: Date.now() });
  return data;
}

// --- Sprint / Task Parsing ---

function parseSprints(productName: string): Sprint[] {
  const tasksPath = repoPath('products', productName, 'docs', 'tasks.md');
  if (!existsSync(tasksPath)) return [];

  let content: string;
  try {
    content = readFileSync(tasksPath, 'utf-8');
  } catch {
    return [];
  }

  const sprints: Sprint[] = [];
  const lines = content.split('\n');
  let current: Sprint | null = null;

  for (const line of lines) {
    // Match sprint/phase headers: ## Sprint 1.1: Name (Status) or ## Phase 1: Name
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch && !line.startsWith('###')) {
      // Skip non-sprint headers (e.g., "## Overall Progress", "## Traceability Matrix", "## Task Summary")
      const headerText = headerMatch[1].trim();
      if (
        !headerText.toLowerCase().startsWith('sprint') &&
        !headerText.toLowerCase().startsWith('phase')
      ) {
        continue;
      }

      if (current) {
        finalizeSprint(current);
        sprints.push(current);
      }

      current = {
        name: headerText,
        status: 'future',
        tasks: [],
        progress: { done: 0, total: 0, percent: 0 },
      };
      continue;
    }

    if (!current) continue;

    // Parse task lines: - [x] **T001** `type` Title — FR-001
    const taskMatch = line.match(
      /^- \[(x| |~)\] \*\*(\w+)\*\*\s+`(\w+)`\s+(.+?)(?:\s*—\s*(.+))?$/,
    );
    if (taskMatch) {
      const checkbox = taskMatch[1];
      let status: SprintTask['status'] = 'pending';
      if (checkbox === 'x') status = 'done';
      else if (checkbox === '~') status = 'in-progress';

      current.tasks.push({
        id: taskMatch[2],
        type: taskMatch[3],
        title: taskMatch[4].trim(),
        status,
        traceability: taskMatch[5]?.trim() ?? '',
      });
    }
  }

  if (current) {
    finalizeSprint(current);
    sprints.push(current);
  }

  return sprints;
}

function finalizeSprint(sprint: Sprint): void {
  const done = sprint.tasks.filter((t) => t.status === 'done').length;
  const total = sprint.tasks.length;
  sprint.progress = {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };

  if (total === 0) {
    sprint.status = 'future';
  } else if (done === total) {
    sprint.status = 'complete';
  } else if (sprint.tasks.some((t) => t.status !== 'pending')) {
    sprint.status = 'in-progress';
  } else {
    sprint.status = 'future';
  }
}

// --- User Story Parsing ---

function parseUserStories(productName: string): UserStory[] {
  const specsDir = repoPath('products', productName, 'docs', 'specs');
  if (!existsSync(specsDir)) return [];

  const stories: UserStory[] = [];

  let specFiles: string[];
  try {
    specFiles = readdirSync(specsDir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }

  for (const file of specFiles) {
    try {
      const content = readFileSync(join(specsDir, file), 'utf-8');
      stories.push(...extractStories(content));
    } catch {
      /* ignore unreadable spec files */
    }
  }

  return stories;
}

function extractStories(content: string): UserStory[] {
  const stories: UserStory[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    // Match: ### User Story N — Title (Priority: PX)
    const storyMatch = lines[i].match(
      /^###\s+User Story (\d+)\s*[—–-]\s*(.+?)\s*\(Priority:\s*(\w+)\)/,
    );
    if (!storyMatch) {
      i++;
      continue;
    }

    const id = `US-${storyMatch[1]}`;
    const title = storyMatch[2].trim();
    const priority = storyMatch[3].trim();
    i++;

    // Extract "As a / I want / So that" from the next few lines
    let asA = '';
    let iWant = '';
    let soThat = '';
    let persona = '';

    // Scan forward for the story text
    while (i < lines.length && !lines[i].startsWith('###')) {
      const line = lines[i].trim();

      // Match: **As a** X, **I want to** Y, **so that** Z
      const storyTextMatch = line.match(
        /\*\*As a\*\*\s+(.+?),?\s+\*\*I want to\*\*\s+(.+?),?\s+\*\*so that\*\*\s+(.+)/i,
      );
      if (storyTextMatch) {
        asA = storyTextMatch[1].trim().replace(/,$/, '');
        iWant = storyTextMatch[2].trim().replace(/,$/, '');
        soThat = storyTextMatch[3].trim().replace(/\.$/, '');
        persona = asA;
      }

      // Check for acceptance criteria section
      if (line.match(/\*\*Acceptance Criteria\*\*/i)) {
        i++;
        const criteria: string[] = [];
        while (i < lines.length && !lines[i].startsWith('###')) {
          const acLine = lines[i].trim();
          // Match numbered criteria: 1. **Given** ...
          if (acLine.match(/^\d+\.\s+/)) {
            criteria.push(acLine.replace(/^\d+\.\s+/, '').trim());
          }
          // Stop at blank line after criteria
          if (acLine === '' && criteria.length > 0) {
            break;
          }
          i++;
        }

        stories.push({
          id,
          title,
          priority,
          persona,
          asA,
          iWant,
          soThat,
          acceptanceCriteria: criteria,
          implemented: false,
        });
        break;
      }

      i++;
    }

    // If we exited without finding acceptance criteria, still add the story
    if (!stories.find((s) => s.id === id)) {
      stories.push({
        id,
        title,
        priority,
        persona,
        asA,
        iWant,
        soThat,
        acceptanceCriteria: [],
        implemented: false,
      });
    }
  }

  return stories;
}

function extractFrCodes(story: UserStory): string[] {
  // Story titles sometimes reference FR codes, but the primary way is through
  // the acceptance criteria text or the traceability in tasks.
  // For now, we use a simple heuristic: map User Story N to FR-00N
  const numMatch = story.id.match(/\d+/);
  if (numMatch) {
    return [`FR-00${numMatch[0]}`];
  }
  return [];
}

// --- GitHub Issues ---

function fetchGitHubIssues(productName: string): GitHubIssue[] {
  try {
    const result = execSync(
      `gh issue list --repo ConnectSW/${productName} --state all --json number,title,state,labels,createdAt,url --limit 50`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(result);
    return parsed.map((issue: Record<string, unknown>) => ({
      number: issue.number,
      title: issue.title,
      state: (issue.state as string).toLowerCase() === 'open' ? 'open' : 'closed',
      labels: ((issue.labels as Array<{ name: string }>) ?? []).map((l) => l.name),
      createdAt: issue.createdAt,
      url: issue.url,
    }));
  } catch {
    // GitHub CLI not available or repo doesn't exist — return empty
    return [];
  }
}
