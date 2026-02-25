import { existsSync, readFileSync } from 'node:fs';
import { repoPath } from './repo.service.js';

export interface Article {
  number: string;
  title: string;
  content: string;
}

export interface Constitution {
  version: string | null;
  ratifiedAt: string | null;
  lastAmended: string | null;
  preamble: string;
  articles: Article[];
  raw: string;
}

/** Cache with 60s TTL */
let cache: { data: Constitution; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getConstitution(): Constitution {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const constitutionPath = repoPath('.specify', 'memory', 'constitution.md');
  if (!existsSync(constitutionPath)) {
    const empty: Constitution = {
      version: null,
      ratifiedAt: null,
      lastAmended: null,
      preamble: '',
      articles: [],
      raw: '',
    };
    cache = { data: empty, ts: Date.now() };
    return empty;
  }

  const raw = readFileSync(constitutionPath, 'utf-8');
  const data = parseConstitution(raw);
  cache = { data, ts: Date.now() };
  return data;
}

function parseConstitution(raw: string): Constitution {
  // Extract version: **Version**: X.Y.Z
  const versionMatch = raw.match(/\*\*Version\*\*:\s*([\d.]+)/);
  const version = versionMatch ? versionMatch[1] : null;

  // Extract ratifiedAt: **Ratified**: date
  const ratifiedMatch = raw.match(/\*\*Ratified\*\*:\s*(.+)/);
  const ratifiedAt = ratifiedMatch ? ratifiedMatch[1].trim() : null;

  // Extract lastAmended: **Last Amended**: date
  const lastAmendedMatch = raw.match(/\*\*Last Amended\*\*:\s*(.+)/);
  const lastAmended = lastAmendedMatch ? lastAmendedMatch[1].trim() : null;

  // Extract preamble: text between the first H2 heading section ("## Preamble") and first article
  // The preamble is the section between the header block and the first "## Article" heading
  const preamble = extractPreamble(raw);

  // Extract articles: ## Article I: Title ... ## Article II: Title ...
  const articles = extractArticles(raw);

  return { version, ratifiedAt, lastAmended, preamble, articles, raw };
}

function extractPreamble(raw: string): string {
  // Find ## Preamble heading
  const preambleMatch = raw.match(/## Preamble\s*\n([\s\S]*?)(?=\n---|\n## Article|\n## Governance|$)/);
  if (preambleMatch) return preambleMatch[1].trim();

  // Fallback: text between first --- separator and first ## Article
  const fallbackMatch = raw.match(/---\s*\n([\s\S]*?)(?=\n## Article)/);
  if (fallbackMatch) return fallbackMatch[1].trim();

  return '';
}

function extractArticles(raw: string): Article[] {
  // Match article headings like: ## Article I: Title or ## Article XI: Title
  const articleRegex = /## (Article\s+(I{1,3}|I?V|V?I{1,3}|I?X|X{1,2}|X?I{1,3}|XI{1,2}|XII?)(?:\.|:)\s*(.+?))\s*\n([\s\S]*?)(?=\n## Article|\n## Governance|$)/g;

  // Simpler approach: split on ## headings that look like article headings
  const articles: Article[] = [];
  const lines = raw.split('\n');
  let currentArticle: { number: string; title: string; lines: string[] } | null = null;

  const articleHeadingRegex = /^## (Article\s+(I{1,3}|I?V|V?I{1,3}|I?X|X{1,2}I{0,2}|XI{0,3})[:.]?\s+(.+))$/;
  // Also handle ## Article XII: Title etc.
  const flexRegex = /^## Article\s+([IVXLCDM]+)(?:[:.]\s*)(.+)$/;
  const governanceRegex = /^## Governance/;

  for (const line of lines) {
    const flexMatch = line.match(flexRegex);
    const isGovernance = governanceRegex.test(line);

    if (isGovernance && currentArticle) {
      articles.push({
        number: currentArticle.number,
        title: currentArticle.title,
        content: currentArticle.lines.join('\n').trim(),
      });
      currentArticle = null;
      continue;
    }

    if (flexMatch) {
      // Save previous article
      if (currentArticle) {
        articles.push({
          number: currentArticle.number,
          title: currentArticle.title,
          content: currentArticle.lines.join('\n').trim(),
        });
      }
      currentArticle = {
        number: flexMatch[1],
        title: flexMatch[2].trim(),
        lines: [],
      };
      continue;
    }

    if (currentArticle) {
      currentArticle.lines.push(line);
    }
  }

  // Push last article if still open
  if (currentArticle) {
    articles.push({
      number: currentArticle.number,
      title: currentArticle.title,
      content: currentArticle.lines.join('\n').trim(),
    });
  }

  return articles;
}
