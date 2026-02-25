import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
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

export interface GitAnalyticsResponse {
  commitsByDay: CommitsByDay[];
  commitsByProduct: Record<string, number>;
  commitsByAuthor: Record<string, number>;
  commitsByType: Record<string, number>;
  totalCommits: number;
  stats: { additions: number; deletions: number };
}

interface RawCommit {
  hash: string;
  date: string;
  author: string;
  message: string;
}

function getRealProductNames(): Set<string> {
  try {
    const productsDir = resolve(repoRoot(), 'products');
    const entries = readdirSync(productsDir, { withFileTypes: true });
    return new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
  } catch {
    return new Set();
  }
}

function groupByCommitType(commits: RawCommit[]): Record<string, number> {
  const map = new Map<string, number>();
  const typeRe = /^(feat|fix|refactor|test|docs|chore|ci|perf|build|style)\b/i;
  for (const c of commits) {
    const match = c.message.match(typeRe);
    const type = match ? match[1].toLowerCase() : 'other';
    map.set(type, (map.get(type) ?? 0) + 1);
  }
  return Object.fromEntries(
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]),
  );
}

/** Cache with 60s TTL (git operations are heavier) */
let cache: { data: GitAnalyticsResponse; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getGitAnalytics(): GitAnalyticsResponse {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const commits = parseCommitLog();
  const numstat = parseNumstat();

  const byDay = groupByDay(commits);
  const byProduct = groupByProduct(commits);
  const byAuthor = groupByAuthor(commits);

  // Convert arrays to Record<string, number> for frontend
  const productRecord: Record<string, number> = {};
  for (const { product, count } of byProduct) productRecord[product] = count;

  const authorRecord: Record<string, number> = {};
  for (const { author, count } of byAuthor) authorRecord[author] = count;

  const realProducts = getRealProductNames();
  const filteredProductRecord: Record<string, number> = {};
  for (const [product, count] of Object.entries(productRecord)) {
    if (realProducts.has(product)) {
      filteredProductRecord[product] = count;
    }
  }

  const commitsByType = groupByCommitType(commits);

  const data: GitAnalyticsResponse = {
    commitsByDay: byDay,
    commitsByProduct: filteredProductRecord,
    commitsByAuthor: authorRecord,
    commitsByType,
    totalCommits: commits.length,
    stats: { additions: numstat.added, deletions: numstat.removed },
  };

  cache = { data, ts: Date.now() };
  return data;
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
