import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { repoPath, repoRoot } from './repo.service.js';

export interface AuditEntry {
  timestamp: string;
  type: string;
  agent?: string;
  product?: string;
  status?: string;
  summary?: string;
  timeMinutes?: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

/** Read audit trail entries */
export function getAuditTrail(limit = 50): AuditEntry[] {
  const trailPath = repoPath('.claude', 'audit-trail.jsonl');
  if (!existsSync(trailPath)) return [];

  try {
    const content = readFileSync(trailPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AuditEntry => e !== null)
      .reverse()
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Get recent git commits */
export function getRecentCommits(limit = 20): GitCommit[] {
  try {
    const output = execSync(
      `git log --format="%H|%h|%an|%aI|%s" -n ${limit}`,
      { cwd: repoRoot(), encoding: 'utf-8', timeout: 5000 },
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, author, date, ...messageParts] = line.split('|');
        return { hash, shortHash, author, date, message: messageParts.join('|') };
      });
  } catch {
    return [];
  }
}

/** Get combined activity feed sorted by time */
export function getActivityFeed(limit = 30): Array<{ type: 'audit' | 'commit'; timestamp: string; data: AuditEntry | GitCommit }> {
  const audit = getAuditTrail(limit).map((e) => ({
    type: 'audit' as const,
    timestamp: e.timestamp,
    data: e,
  }));

  const commits = getRecentCommits(limit).map((c) => ({
    type: 'commit' as const,
    timestamp: c.date,
    data: c,
  }));

  return [...audit, ...commits]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
