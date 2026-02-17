import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
}

export interface QualityReport {
  filename: string;
  title: string;
  lastModified: string;
}

export interface ProductQuality {
  product: string;
  hasAudit: boolean;
  overallScore: number | null;
  dimensions: DimensionScore[];
  qualityReports: QualityReport[];
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
    .sort((a, b) => a.product.localeCompare(b.product));

  cache = { data, ts: Date.now() };
  return data;
}

function buildProductQuality(product: string): ProductQuality {
  const dir = repoPath('products', product);
  const auditPath = join(dir, 'docs', 'AUDIT-REPORT.md');
  const hasAudit = existsSync(auditPath);

  let overallScore: number | null = null;
  let dimensions: DimensionScore[] = [];

  if (hasAudit) {
    const parsed = parseAuditReport(auditPath);
    overallScore = parsed.overall;
    dimensions = parsed.dimensions;
  }

  const qualityReports = loadQualityReports(dir);

  return { product, hasAudit, overallScore, dimensions, qualityReports };
}

interface ParsedAudit {
  overall: number | null;
  dimensions: DimensionScore[];
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
    const dimensions: DimensionScore[] = [];
    const dimensionRegex =
      /\|\s*(\w[\w\s]*?)\s*\|\s*(\d+)\/(\d+)\s*\|\s*\d+%\s*\|/g;
    let match: RegExpExecArray | null;
    while ((match = dimensionRegex.exec(content)) !== null) {
      const dimension = match[1].trim();
      const score = parseInt(match[2], 10);
      const maxScore = parseInt(match[3], 10);
      if (dimension && !isNaN(score) && !isNaN(maxScore)) {
        dimensions.push({ dimension, score, maxScore });
      }
    }

    return { overall, dimensions };
  } catch {
    return { overall: null, dimensions: [] };
  }
}

function loadQualityReports(dir: string): QualityReport[] {
  const reportsDir = join(dir, 'docs', 'quality-reports');
  if (!existsSync(reportsDir)) return [];

  try {
    const files = readdirSync(reportsDir).filter((f) => f.endsWith('.md'));
    return files.map((filename) => {
      const fullPath = join(reportsDir, filename);
      let title = filename.replace('.md', '');
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) title = titleMatch[1].trim();
      } catch { /* ignore */ }

      let lastModified = new Date().toISOString();
      try {
        lastModified = statSync(fullPath).mtime.toISOString();
      } catch { /* ignore */ }

      return { filename, title, lastModified };
    });
  } catch {
    return [];
  }
}
