import { execSync } from 'node:child_process';
import { repoRoot } from './repo.service.js';

export interface PR {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: string;
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  ciStatus: 'success' | 'failure' | 'pending' | 'unknown';
  ageHours: number;
}

export interface PRDashboardStats {
  total: number;
  open: number;
  draft: number;
  approved: number;
  needsReview: number;
  ciFailures: number;
}

export interface PRDashboardData {
  open: PR[];
  recentlyClosed: PR[];
  stats: PRDashboardStats;
}

interface RawPR {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  baseRefName: string;
  isDraft: boolean;
  reviewDecision: string | null;
  statusCheckRollup: Array<{ state?: string; conclusion?: string }> | null;
}

const GH_FIELDS =
  'number,title,state,author,createdAt,updatedAt,headRefName,baseRefName,isDraft,reviewDecision,statusCheckRollup';

function runGhCommand(args: string): RawPR[] {
  try {
    const output = execSync(`gh pr list ${args} --json ${GH_FIELDS}`, {
      cwd: repoRoot(),
      encoding: 'utf-8',
      timeout: 15_000,
    });
    return JSON.parse(output) as RawPR[];
  } catch {
    return [];
  }
}

function deriveCiStatus(rollup: RawPR['statusCheckRollup']): PR['ciStatus'] {
  if (!rollup || rollup.length === 0) return 'unknown';

  const states = rollup.map((c) => {
    const v = (c.conclusion ?? c.state ?? '').toUpperCase();
    return v;
  });

  if (states.some((s) => s === 'FAILURE' || s === 'ERROR' || s === 'TIMED_OUT')) return 'failure';
  if (states.some((s) => s === 'PENDING' || s === 'IN_PROGRESS' || s === 'QUEUED' || s === 'WAITING')) return 'pending';
  if (states.every((s) => s === 'SUCCESS')) return 'success';
  return 'unknown';
}

function normalizeReviewDecision(raw: string | null): PR['reviewDecision'] {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const valid = ['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED'] as const;
  return (valid as readonly string[]).includes(upper)
    ? (upper as PR['reviewDecision'])
    : null;
}

function normalizeState(raw: string): PR['state'] {
  const upper = raw.toUpperCase();
  if (upper === 'OPEN') return 'OPEN';
  if (upper === 'MERGED') return 'MERGED';
  return 'CLOSED';
}

function mapRaw(raw: RawPR): PR {
  const createdAt = new Date(raw.createdAt);
  const ageHours = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

  return {
    number: raw.number,
    title: raw.title,
    state: normalizeState(raw.state),
    author: raw.author?.login ?? 'unknown',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    headBranch: raw.headRefName,
    baseBranch: raw.baseRefName,
    isDraft: raw.isDraft ?? false,
    reviewDecision: normalizeReviewDecision(raw.reviewDecision),
    ciStatus: deriveCiStatus(raw.statusCheckRollup),
    ageHours,
  };
}

function computeStats(open: PR[], closed: PR[]): PRDashboardStats {
  const all = [...open, ...closed];
  return {
    total: all.length,
    open: open.length,
    draft: open.filter((p) => p.isDraft).length,
    approved: open.filter((p) => p.reviewDecision === 'APPROVED').length,
    needsReview: open.filter(
      (p) => p.reviewDecision === 'REVIEW_REQUIRED' || p.reviewDecision === null,
    ).length,
    ciFailures: open.filter((p) => p.ciStatus === 'failure').length,
  };
}

/** Cache with 60-second TTL */
let cache: { data: PRDashboardData; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getPRDashboard(): PRDashboardData {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const rawOpen = runGhCommand('--state=open --limit=50');
  const rawClosed = runGhCommand('--state=closed --limit=20');

  const open = rawOpen.map(mapRaw);
  const recentlyClosed = rawClosed.map(mapRaw);
  const stats = computeStats(open, recentlyClosed);

  const data: PRDashboardData = { open, recentlyClosed, stats };
  cache = { data, ts: Date.now() };
  return data;
}
