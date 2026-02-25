import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface AuditReport {
  product: string;
  overallScore: number | null;
  lastModified: string;
  excerpt: string;
  content: string;
  qualityReports: string[];
}

export interface AuditReportsResponse {
  reports: AuditReport[];
  stats: {
    total: number;
    audited: number;
    avgScore: number | null;
    topScore: number | null;
  };
}

/** Cache with 60s TTL */
let cache: { data: AuditReportsResponse; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getAuditReports(): AuditReportsResponse {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return emptyResponse();

  const products = readdirSync(productsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const reports: AuditReport[] = [];

  for (const product of products) {
    const auditPath = join(repoPath('products', product), 'docs', 'AUDIT-REPORT.md');
    if (!existsSync(auditPath)) continue;

    try {
      const content = readFileSync(auditPath, 'utf-8');
      const stat = statSync(auditPath);
      const overallScore = parseOverallScore(content);
      const excerpt = extractExcerpt(content);

      const qualityDir = join(repoPath('products', product), 'docs', 'quality-reports');
      const qualityReports: string[] = [];
      if (existsSync(qualityDir)) {
        try {
          readdirSync(qualityDir)
            .filter((f) => f.endsWith('.md'))
            .forEach((f) => qualityReports.push(f.replace('.md', '')));
        } catch { /* ignore */ }
      }

      reports.push({
        product,
        overallScore,
        lastModified: stat.mtime.toISOString(),
        excerpt,
        content,
        qualityReports,
      });
    } catch { /* skip unreadable files */ }
  }

  // Sort: highest score first, then alphabetically for unscored
  reports.sort((a, b) => {
    if (a.overallScore !== null && b.overallScore !== null) return b.overallScore - a.overallScore;
    if (a.overallScore !== null) return -1;
    if (b.overallScore !== null) return 1;
    return a.product.localeCompare(b.product);
  });

  const scores = reports.map((r) => r.overallScore).filter((s): s is number => s !== null);
  const stats = {
    total: products.length,
    audited: reports.length,
    avgScore: scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null,
    topScore: scores.length > 0 ? Math.max(...scores) : null,
  };

  const data: AuditReportsResponse = { reports, stats };
  cache = { data, ts: Date.now() };
  return data;
}

function parseOverallScore(content: string): number | null {
  // Format A: **Overall Score: 8.8/10**
  const p1 = content.match(/\*\*Overall Score:\s*([0-9.]+)\/10/i);
  if (p1) return parseFloat(p1[1]);
  // Format B: | **Overall** | **7.1/10** |
  const p2 = content.match(/\|\s*\*\*Overall\*\*\s*\|\s*\*\*([0-9.]+)\/10\*\*/);
  if (p2) return parseFloat(p2[1]);
  // Fallback: **Technical Score: 7.7/10**
  const p3 = content.match(/\*\*(?:Technical|Composite)\s+Score:\s*([0-9.]+)\/10/i);
  if (p3) return parseFloat(p3[1]);
  return null;
}

function extractExcerpt(content: string): string {
  // Try executive summary section
  const execMatch = content.match(/##?\s+Executive Summary\s*\n([\s\S]{30,600}?)(?=\n##)/i);
  if (execMatch) {
    return execMatch[1]
      .replace(/^\s*[#*\-|>]+\s*/gm, '')
      .trim()
      .slice(0, 350);
  }
  // Fallback: first meaningful paragraphs
  const lines = content.split('\n');
  const para: string[] = [];
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('|') || line.startsWith('-') || !line.trim()) continue;
    const t = line.replace(/\*\*/g, '').trim();
    if (t.length > 25) {
      para.push(t);
      if (para.join(' ').length > 250) break;
    }
  }
  return para.join(' ').slice(0, 350);
}

function emptyResponse(): AuditReportsResponse {
  return { reports: [], stats: { total: 0, audited: 0, avgScore: null, topScore: null } };
}
