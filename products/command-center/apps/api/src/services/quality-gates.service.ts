import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface ProductQuality {
  name: string;
  hasAudit: boolean;
  overallScore: number;
  scores: Record<string, number>;
  recentReports: string[];
}

/** Cache with 60s TTL */
let cache: { data: ProductQuality[]; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getQualityGates(): ProductQuality[] {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const entries = readdirSync(productsDir, { withFileTypes: true });
  const data = entries
    .filter((e) => e.isDirectory())
    .map((e) => buildProductQuality(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  cache = { data, ts: Date.now() };
  return data;
}

function buildProductQuality(product: string): ProductQuality {
  const dir = repoPath('products', product);
  const auditPath = join(dir, 'docs', 'AUDIT-REPORT.md');
  const hasAudit = existsSync(auditPath);

  let overallScore = 0;
  let scores: Record<string, number> = {};

  if (hasAudit) {
    const parsed = parseAuditReport(auditPath);
    overallScore = parsed.overall ?? 0;
    scores = parsed.scores;
  }

  const recentReports = loadRecentReportNames(dir);

  return { name: product, hasAudit, overallScore, scores, recentReports };
}

interface ParsedAudit {
  overall: number | null;
  scores: Record<string, number>;
}

function parseAuditReport(auditPath: string): ParsedAudit {
  try {
    const content = readFileSync(auditPath, 'utf-8');

    // Parse overall score
    let overall: number | null = null;
    const overallMatch = content.match(
      /\*\*Overall\*\*\s*\|\s*\*\*([0-9.]+)\/10\*\*/,
    );
    if (overallMatch) {
      overall = parseFloat(overallMatch[1]);
    }

    // Parse dimension scores from the composite scores table
    // Format: | Category | Score | Weight | Weighted |
    const scores: Record<string, number> = {};
    const dimensionRegex =
      /\|\s*(\w[\w\s]*?)\s*\|\s*(\d+)\/(\d+)\s*\|\s*\d+%\s*\|/g;
    let match: RegExpExecArray | null;
    while ((match = dimensionRegex.exec(content)) !== null) {
      const dimension = match[1].trim();
      const score = parseInt(match[2], 10);
      if (dimension && !isNaN(score)) {
        scores[dimension] = score;
      }
    }

    return { overall, scores };
  } catch {
    return { overall: null, scores: {} };
  }
}

function loadRecentReportNames(dir: string): string[] {
  const reportsDir = join(dir, 'docs', 'quality-reports');
  if (!existsSync(reportsDir)) return [];

  try {
    return readdirSync(reportsDir)
      .filter((f) => f.endsWith('.md'))
      .map((filename) => {
        const fullPath = join(reportsDir, filename);
        let title = filename.replace('.md', '');
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch) title = titleMatch[1].trim();
        } catch { /* ignore */ }
        return title;
      });
  } catch {
    return [];
  }
}
