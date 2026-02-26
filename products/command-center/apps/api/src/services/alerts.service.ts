import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { repoPath, repoRoot } from './repo.service.js';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  product: string | null;
  timestamp: string;
}

/** Cache with 30s TTL */
let cache: { data: Alert[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

export function getAlerts(): Alert[] {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const alerts: Alert[] = [];
  let nextId = 1;

  // 1. Check audit trail for recent failures
  const auditAlerts = checkAuditTrailFailures();
  for (const a of auditAlerts) {
    alerts.push({ ...a, id: `alert-${nextId++}` });
  }

  // 2. Check for stale products (no commits in 14+ days)
  const staleAlerts = checkStaleProducts();
  for (const a of staleAlerts) {
    alerts.push({ ...a, id: `alert-${nextId++}` });
  }

  // 3. Check for TypeScript config issues
  const tsAlerts = checkTypeScriptConfigs();
  for (const a of tsAlerts) {
    alerts.push({ ...a, id: `alert-${nextId++}` });
  }

  // 4. Check for missing documentation
  const docsAlerts = checkMissingDocs();
  for (const a of docsAlerts) {
    alerts.push({ ...a, id: `alert-${nextId++}` });
  }

  // 5. Check for unmerged feature branches
  const branchAlerts = checkStaleBranches();
  for (const a of branchAlerts) {
    alerts.push({ ...a, id: `alert-${nextId++}` });
  }

  // Sort by severity (critical first), then timestamp (newest first)
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  alerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  cache = { data: alerts, ts: Date.now() };
  return alerts;
}

function checkAuditTrailFailures(): Omit<Alert, 'id'>[] {
  const trailPath = repoPath('.claude', 'audit-trail.jsonl');
  if (!existsSync(trailPath)) return [];

  const alerts: Omit<Alert, 'id'>[] = [];
  try {
    const content = readFileSync(trailPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    // Check last 100 entries for failures
    const recent = lines.slice(-100);

    for (const line of recent) {
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        const status = entry.status as string | undefined;
        if (status === 'failure' || status === 'blocked') {
          alerts.push({
            severity: status === 'failure' ? 'critical' : 'warning',
            source: 'audit-trail',
            message: `${entry.type ?? 'Task'}: ${entry.summary ?? 'Unknown'} (${status})`,
            product: (entry.product as string) ?? null,
            timestamp: (entry.timestamp as string) ?? new Date().toISOString(),
          });
        }
      } catch { /* skip malformed lines */ }
    }
  } catch { /* ignore */ }

  return alerts;
}

function checkStaleProducts(): Omit<Alert, 'id'>[] {
  const alerts: Omit<Alert, 'id'>[] = [];
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const products = readdirSync(productsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const now = new Date().toISOString();

  for (const product of products) {
    try {
      const output = execSync(
        `git log --format="%aI" -n 1 -- products/${product}`,
        { cwd: repoRoot(), encoding: 'utf-8', timeout: 5000 },
      );
      const lastDate = output.trim();
      if (!lastDate) continue;

      const lastCommitTime = new Date(lastDate).getTime();
      if (lastCommitTime < fourteenDaysAgo) {
        const daysSince = Math.floor(
          (Date.now() - lastCommitTime) / (24 * 60 * 60 * 1000),
        );
        alerts.push({
          severity: 'warning',
          source: 'stale-check',
          message: `No commits in ${daysSince} days (last: ${lastDate.slice(0, 10)})`,
          product,
          timestamp: now,
        });
      }
    } catch { /* ignore */ }
  }

  return alerts;
}

function checkMissingDocs(): Omit<Alert, 'id'>[] {
  const alerts: Omit<Alert, 'id'>[] = [];
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const products = readdirSync(productsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const now = new Date().toISOString();

  for (const product of products) {
    const dir = repoPath('products', product);
    const docsDir = join(dir, 'docs');

    // Only check products that have apps/ (are real products, not skeletons)
    const hasApps = existsSync(join(dir, 'apps'));
    if (!hasApps) continue;

    if (!existsSync(join(docsDir, 'PRD.md'))) {
      alerts.push({
        severity: 'warning',
        source: 'docs-check',
        message: 'Missing PRD.md — product requirements not documented',
        product,
        timestamp: now,
      });
    }

    if (!existsSync(join(docsDir, 'tasks.md'))) {
      alerts.push({
        severity: 'info',
        source: 'docs-check',
        message: 'Missing tasks.md — no task list found for sprint board',
        product,
        timestamp: now,
      });
    }
  }

  return alerts;
}

function checkStaleBranches(): Omit<Alert, 'id'>[] {
  const alerts: Omit<Alert, 'id'>[] = [];
  const now = new Date().toISOString();

  try {
    const output = execSync(
      'git branch -r --format="%(refname:short) %(committerdate:iso-strict)"',
      { cwd: repoRoot(), encoding: 'utf-8', timeout: 10000 },
    );

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const line of output.trim().split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(' ');
      const branchName = parts[0];
      const dateStr = parts[1];

      if (!branchName || branchName.includes('HEAD')) continue;
      // Only flag feature/fix branches (not main, release, etc.)
      if (!/\/(feature|fix|arch|foundation)\//.test(branchName)) continue;

      if (dateStr) {
        const branchTime = new Date(dateStr).getTime();
        if (branchTime < thirtyDaysAgo) {
          const daysSince = Math.floor((Date.now() - branchTime) / (24 * 60 * 60 * 1000));
          const shortName = branchName.replace('origin/', '');
          alerts.push({
            severity: 'info',
            source: 'branch-check',
            message: `Branch "${shortName}" has had no commits in ${daysSince} days — consider merging or closing`,
            product: null,
            timestamp: now,
          });
        }
      }
    }
  } catch { /* git not available or no remote */ }

  return alerts;
}

function checkTypeScriptConfigs(): Omit<Alert, 'id'>[] {
  const alerts: Omit<Alert, 'id'>[] = [];
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const products = readdirSync(productsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const now = new Date().toISOString();

  for (const product of products) {
    const dir = repoPath('products', product);
    // Check if product has source code but no tsconfig
    const hasSrc =
      existsSync(join(dir, 'apps', 'api', 'src')) ||
      existsSync(join(dir, 'apps', 'web', 'src'));

    if (!hasSrc) continue;

    const tsconfigPaths = [
      join(dir, 'tsconfig.json'),
      join(dir, 'apps', 'api', 'tsconfig.json'),
      join(dir, 'apps', 'web', 'tsconfig.json'),
    ];

    const hasAnyTsconfig = tsconfigPaths.some((p) => existsSync(p));
    if (!hasAnyTsconfig) {
      alerts.push({
        severity: 'info',
        source: 'typescript-check',
        message: 'Product has source code but no tsconfig.json found',
        product,
        timestamp: now,
      });
    }
  }

  return alerts;
}
