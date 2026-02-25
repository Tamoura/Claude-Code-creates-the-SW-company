import { readdirSync, existsSync, readFileSync } from 'node:fs';
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
    .sort((a, b) => {
      // Audited products first, sorted by score desc
      if (a.hasAudit && !b.hasAudit) return -1;
      if (!a.hasAudit && b.hasAudit) return 1;
      return b.overallScore - a.overallScore;
    });

  cache = { data, ts: Date.now() };
  return data;
}

function buildProductQuality(product: string): ProductQuality {
  const dir = repoPath('products', product);
  const auditPath = `${dir}/docs/AUDIT-REPORT.md`;
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

// ── Dimension name normalization ──────────────────────────────────────

const DIMENSION_MAP: Record<string, string> = {
  'security': 'Security',
  'architecture': 'Architecture',
  'test coverage': 'Testing',
  'testing': 'Testing',
  'code quality': 'Code Quality',
  'performance': 'Performance',
  'devops': 'DevOps',
  'runability': 'Runability',
  'accessibility': 'Accessibility',
  'privacy': 'Privacy',
  'observability': 'Observability',
  'api design': 'API Design',
  'security readiness': 'Security Readiness',
  'product potential': 'Product Potential',
  'enterprise readiness': 'Enterprise Readiness',
};

function normalizeDimension(raw: string): string | null {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  return DIMENSION_MAP[key] ?? null;
}

// ── Audit report parser — handles 3 real-world formats ────────────────
//
// Format A (muaththir): | Security | 7/10 | 25% | 1.75 |
// Format B (connectin): | **Security** | **9/10** | +1 | rationale |
// Format C (stablecoin): | Security | 7/10 | rationale text |
// Overall A: | **Overall** | **7.1/10** |
// Overall B/C: **Overall Score: 8.8/10**

interface ParsedAudit {
  overall: number | null;
  scores: Record<string, number>;
}

function parseAuditReport(auditPath: string): ParsedAudit {
  try {
    const content = readFileSync(auditPath, 'utf-8');

    // ── Overall score ─────────────────────────────────────────────────
    let overall: number | null = null;

    // Pattern 1: **Overall Score: 8.8/10** (with optional trailing text)
    const p1 = content.match(/\*\*Overall Score:\s*([0-9.]+)\/10/i);
    if (p1) overall = parseFloat(p1[1]);

    // Pattern 2: | **Overall** | **7.1/10** | (table row)
    if (overall === null) {
      const p2 = content.match(/\|\s*\*\*Overall\*\*\s*\|\s*\*\*([0-9.]+)\/10\*\*/);
      if (p2) overall = parseFloat(p2[1]);
    }

    // Pattern 3: **Technical Score: 7.7/10** (fallback)
    if (overall === null) {
      const p3 = content.match(/\*\*Technical Score:\s*([0-9.]+)\/10\*\*/);
      if (p3) overall = parseFloat(p3[1]);
    }

    // ── Dimension scores ──────────────────────────────────────────────
    // One regex covers all 3 formats:
    // | [**]DimensionName[**] | [**]N/10[**] | <anything>
    const scores: Record<string, number> = {};
    const dimRegex = /\|\s*\*{0,2}([\w][\w\s/-]*?)\*{0,2}\s*\|\s*\*{0,2}(\d+)\/10\*{0,2}\s*\|/g;
    let m: RegExpExecArray | null;
    while ((m = dimRegex.exec(content)) !== null) {
      const raw = m[1].trim();
      const score = parseInt(m[2], 10);
      // Skip header/separator rows and composites
      if (['dimension', 'category', 'overall', 'composite'].includes(raw.toLowerCase())) continue;
      const normalized = normalizeDimension(raw);
      if (normalized && !isNaN(score) && score >= 0 && score <= 10) {
        // Only update if we don't already have this dimension (first match wins)
        if (!(normalized in scores)) {
          scores[normalized] = score;
        }
      }
    }

    return { overall, scores };
  } catch {
    return { overall: null, scores: {} };
  }
}

function loadRecentReportNames(dir: string): string[] {
  const reportsDir = `${dir}/docs/quality-reports`;
  if (!existsSync(reportsDir)) return [];

  try {
    return readdirSync(reportsDir)
      .filter((f) => f.endsWith('.md'))
      .map((filename) => {
        const fullPath = `${reportsDir}/${filename}`;
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
