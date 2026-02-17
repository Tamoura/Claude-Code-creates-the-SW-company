import { execSync } from 'node:child_process';
import { repoRoot } from './repo.service.js';

export interface CommitsByDay {
  date: string;
  count: number;
}

export interface CommitsByProduct {
  product: string;
  count: number;
}

export interface CommitsByAuthor {
  author: string;
  count: number;
}

export interface LinesChanged {
  added: number;
  removed: number;
}

export interface GitAnalytics {
  commitsByDay: CommitsByDay[];
  commitsByProduct: CommitsByProduct[];
  commitsByAuthor: CommitsByAuthor[];
  totalCommits: number;
  linesChanged: LinesChanged;
}

/** Cache with 60s TTL (git operations are heavier) */
let cache: { data: GitAnalytics; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getGitAnalytics(): GitAnalytics {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const commits = parseCommitLog();
  const numstat = parseNumstat();

  const byDay = groupByDay(commits);
  const byProduct = groupByProduct(commits);
  const byAuthor = groupByAuthor(commits);

  const data: GitAnalytics = {
    commitsByDay: byDay,
    commitsByProduct: byProduct,
    commitsByAuthor: byAuthor,
    totalCommits: commits.length,
    linesChanged: numstat,
  };

  cache = { data, ts: Date.now() };
  return data;
}

interface RawCommit {
  hash: string;
  date: string;
  author: string;
  message: string;
}

function parseCommitLog(): RawCommit[] {
  try {
    const output = execSync(
      'git log --format="%H|%aI|%an|%s" --since="30 days ago" -200',
      { cwd: repoRoot(), encoding: 'utf-8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 },
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, date, author, ...msgParts] = line.split('|');
        return { hash, date, author, message: msgParts.join('|') };
      });
  } catch {
    return [];
  }
}

function parseNumstat(): LinesChanged {
  try {
    // Use --shortstat on only the 10 most recent commits to avoid
    // hanging on massive diffs (e.g. 136K-line deletions) in repo history
    const output = execSync(
      'git log --format="" --shortstat -10',
      { cwd: repoRoot(), encoding: 'utf-8', timeout: 5000, maxBuffer: 1024 * 1024 },
    );
    let added = 0;
    let removed = 0;
    for (const line of output.trim().split('\n')) {
      if (!line.trim()) continue;
      const insertMatch = line.match(/(\d+) insertion/);
      const deleteMatch = line.match(/(\d+) deletion/);
      if (insertMatch) added += parseInt(insertMatch[1], 10);
      if (deleteMatch) removed += parseInt(deleteMatch[1], 10);
    }
    return { added, removed };
  } catch {
    return { added: 0, removed: 0 };
  }
}

function groupByDay(commits: RawCommit[]): CommitsByDay[] {
  const map = new Map<string, number>();
  for (const c of commits) {
    const day = c.date.slice(0, 10); // YYYY-MM-DD
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupByProduct(commits: RawCommit[]): CommitsByProduct[] {
  const map = new Map<string, number>();
  for (const c of commits) {
    const product = extractProductFromMessage(c.message);
    map.set(product, (map.get(product) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count);
}

function extractProductFromMessage(message: string): string {
  // conventional commit: feat(scope): ... or fix(scope): ...
  const match = message.match(/^\w+\(([^)]+)\)/);
  if (match) return match[1];
  return 'other';
}

function groupByAuthor(commits: RawCommit[]): CommitsByAuthor[] {
  const map = new Map<string, number>();
  for (const c of commits) {
    map.set(c.author, (map.get(c.author) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count);
}
