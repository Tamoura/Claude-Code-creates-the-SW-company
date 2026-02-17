import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { repoPath, repoRoot } from './repo.service.js';

export interface ProductHealth {
  name: string;
  displayName: string;
  phase: string;
  buildStatus: 'configured' | 'missing';
  testCount: number;
  lastCommit: string;
  lastCommitDate: string;
  auditScore: number | null;
  fileCount: number;
  hasApi: boolean;
  hasWeb: boolean;
}

/** Cache with 30s TTL */
let cache: { data: ProductHealth[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

export function getHealthScorecard(): ProductHealth[] {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const entries = readdirSync(productsDir, { withFileTypes: true });
  const data = entries
    .filter((e) => e.isDirectory())
    .map((e) => buildHealth(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  cache = { data, ts: Date.now() };
  return data;
}

function buildHealth(name: string): ProductHealth {
  const dir = repoPath('products', name);
  const hasApi = existsSync(join(dir, 'apps', 'api'));
  const hasWeb = existsSync(join(dir, 'apps', 'web'));

  const commit = getLastCommitForProduct(name);

  return {
    name,
    displayName: name
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' '),
    phase: detectPhase(dir),
    buildStatus: detectBuildStatus(dir),
    testCount: detectTestCount(dir),
    lastCommit: commit?.message ?? '',
    lastCommitDate: commit?.date ?? '',
    auditScore: parseAuditScore(dir),
    fileCount: countSourceFiles(dir),
    hasApi,
    hasWeb,
  };
}

function detectPhase(dir: string): string {
  const hasTests = existsSync(join(dir, 'apps', 'api', 'tests'));
  const hasE2e = existsSync(join(dir, 'e2e'));
  const hasDocs = existsSync(join(dir, 'docs', 'PRD.md'));
  const hasDocker = existsSync(join(dir, 'docker-compose.yml'));

  if (hasTests && hasE2e && hasDocker && hasDocs) return 'Production';
  if (hasTests && hasDocker) return 'MVP';
  if (existsSync(join(dir, 'apps', 'api', 'src')) || existsSync(join(dir, 'apps', 'web', 'src'))) return 'Foundation';
  return 'Planned';
}

function detectBuildStatus(dir: string): 'configured' | 'missing' {
  for (const sub of ['apps/api', 'apps/web', '.']) {
    const pkgPath = join(dir, sub, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts?.build) return 'configured';
      } catch { /* ignore */ }
    }
  }
  return 'missing';
}

function detectTestCount(dir: string): number {
  let count = 0;
  for (const sub of ['apps/api/tests', 'apps/web/tests', 'apps/web/src', 'apps/api/src']) {
    const testDir = join(dir, sub);
    if (existsSync(testDir)) {
      count += countTestFiles(testDir);
    }
  }
  return count;
}

function countTestFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countTestFiles(fullPath);
      } else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        count++;
      }
    }
  } catch { /* ignore */ }
  return count;
}

interface LastCommit { hash: string; date: string; author: string; message: string }

function getLastCommitForProduct(name: string): LastCommit | null {
  try {
    const output = execSync(
      `git log --format="%H|%aI|%an|%s" -n 1 -- products/${name}`,
      { cwd: repoRoot(), encoding: 'utf-8', timeout: 5000 },
    );
    const line = output.trim();
    if (!line) return null;
    const [hash, date, author, ...msgParts] = line.split('|');
    return { hash, date, author, message: msgParts.join('|') };
  } catch {
    return null;
  }
}

function parseAuditScore(dir: string): number | null {
  const auditPath = join(dir, 'docs', 'AUDIT-REPORT.md');
  if (!existsSync(auditPath)) return null;

  try {
    const content = readFileSync(auditPath, 'utf-8');
    const match = content.match(/\*\*Overall\*\*\s*\|\s*\*\*([0-9.]+)\/10\*\*/);
    if (match) return parseFloat(match[1]);
  } catch { /* ignore */ }
  return null;
}

function countSourceFiles(dir: string): number {
  let count = 0;
  const srcDirs = ['apps/api/src', 'apps/web/src'];
  for (const sub of srcDirs) {
    const srcDir = join(dir, sub);
    if (existsSync(srcDir)) {
      count += countFilesRecursive(srcDir);
    }
  }
  return count;
}

function countFilesRecursive(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFilesRecursive(join(dir, entry.name));
      } else {
        count++;
      }
    }
  } catch { /* ignore */ }
  return count;
}
