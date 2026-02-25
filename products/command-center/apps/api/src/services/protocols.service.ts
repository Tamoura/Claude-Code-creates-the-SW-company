import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { repoPath } from './repo.service.js';

export interface Protocol {
  id: string;
  name: string;
  description: string;
  version: string | null;
  createdAt: string | null;
  source: string | null;
  category: string;
  content: string;
  tags: string[];
}

const CATEGORY_MAP: Record<string, string> = {
  'context-engineering': 'Context Engineering',
  'context-compression': 'Context Engineering',
  'direct-delivery': 'Context Engineering',
  'anti-rationalization': 'Quality Assurance',
  'verification-before-completion': 'Quality Assurance',
  'development-oriented-testing': 'Testing',
  'dynamic-test-generation': 'Testing',
  'repository-back-translation': 'Testing',
  'parallel-execution': 'Execution',
  'agent-message.schema': 'Agent Communication',
  'message-router': 'Agent Communication',
};

const TAGS_MAP: Record<string, string[]> = {
  'Context Engineering': ['context', 'tokens', 'attention', 'progressive-disclosure'],
  'Quality Assurance': ['quality', 'tdd', 'verification', 'anti-patterns'],
  'Testing': ['testing', 'tdd', 'test-generation', 'debugging'],
  'Execution': ['parallel', 'agents', 'orchestration', 'performance'],
  'Agent Communication': ['agents', 'messages', 'protocol', 'schema'],
};

function prettifyFilename(filename: string): string {
  return filename
    .replace(/[-_.]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function extractFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  // Look for **Key**: value patterns in the first 15 lines
  for (const line of lines.slice(0, 15)) {
    const match = line.match(/^\*\*([^*]+)\*\*:\s*(.+)/);
    if (match) {
      result[match[1].toLowerCase().trim()] = match[2].trim();
    }
    // Also check YAML-style: key: value
    const yamlMatch = line.match(/^(\w[\w\s]+):\s*(.+)/);
    if (yamlMatch && !match) {
      result[yamlMatch[1].toLowerCase().trim()] = yamlMatch[2].trim();
    }
  }
  return result;
}

function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractDescription(content: string): string {
  const lines = content.split('\n');
  let pastH1 = false;
  let descLines: string[] = [];

  for (const line of lines) {
    if (!pastH1) {
      if (line.startsWith('# ')) pastH1 = true;
      continue;
    }
    // Skip frontmatter-like lines (bold key-value pairs)
    if (/^\*\*[^*]+\*\*:/.test(line)) continue;
    // Skip horizontal rules
    if (/^---+$/.test(line.trim())) continue;
    // Skip empty lines before we've started
    if (descLines.length === 0 && !line.trim()) continue;
    // Stop at next heading
    if (line.startsWith('#')) break;
    // Stop at second blank line after we've started collecting
    if (!line.trim() && descLines.length > 0) break;

    if (line.trim()) descLines.push(line.trim());
  }

  return descLines.join(' ').slice(0, 300) || '';
}

function extractVersion(content: string, frontmatter: Record<string, string>): string | null {
  if (frontmatter['version']) return frontmatter['version'];
  // YAML comment style: # Version: 1.0.0
  const commentMatch = content.match(/^#\s+Version:\s*([\d.]+)/m);
  if (commentMatch) return commentMatch[1];
  // Inline mention: v1.0.0
  const inlineMatch = content.match(/\bv([\d]+\.[\d]+\.[\d]+)\b/);
  if (inlineMatch) return inlineMatch[1];
  return null;
}

function extractSource(content: string, frontmatter: Record<string, string>): string | null {
  if (frontmatter['source']) return frontmatter['source'];
  // Look for "Inspired by:" line
  const inspiredMatch = content.match(/\*\*Inspired by\*\*:\s*(.+)/);
  if (inspiredMatch) return inspiredMatch[1].trim();
  return null;
}

function parseProtocolFile(filePath: string, id: string): Protocol {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatter = extractFrontmatter(content);

  const h1 = extractH1(content);
  const name = h1 ?? prettifyFilename(id);
  const description = extractDescription(content);
  const version = extractVersion(content, frontmatter);
  const createdAt = frontmatter['created'] ?? null;
  const source = extractSource(content, frontmatter);
  const category = CATEGORY_MAP[id] ?? 'General';
  const tags = [...(TAGS_MAP[category] ?? [])];

  return { id, name, description, version, createdAt, source, category, content, tags };
}

/** Cache with 60s TTL */
let cache: { data: Protocol[]; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getProtocols(): Protocol[] {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const protocolsDir = repoPath('.claude', 'protocols');
  if (!existsSync(protocolsDir)) {
    cache = { data: [], ts: Date.now() };
    return [];
  }

  const protocols: Protocol[] = [];

  try {
    const files = readdirSync(protocolsDir).filter((f) => {
      const ext = extname(f);
      return ext === '.md' || ext === '.yml' || ext === '.ts';
    });

    for (const file of files) {
      const ext = extname(file);
      const id = basename(file, ext);
      const filePath = join(protocolsDir, file);

      try {
        if (ext === '.yml' || ext === '.ts') {
          // For non-markdown files, create a simpler protocol entry
          const content = readFileSync(filePath, 'utf-8');
          const category = CATEGORY_MAP[id] ?? 'Agent Communication';
          const versionMatch = content.match(/Version:\s*([\d.]+)/);
          const h1Match = content.match(/^#\s+(.+)$/m);

          protocols.push({
            id,
            name: h1Match ? h1Match[1].trim() : prettifyFilename(id),
            description: `${ext === '.yml' ? 'YAML schema' : 'TypeScript module'} defining the ${prettifyFilename(id)} protocol`,
            version: versionMatch ? versionMatch[1] : null,
            createdAt: null,
            source: null,
            category,
            content,
            tags: [...(TAGS_MAP[category] ?? [])],
          });
        } else {
          protocols.push(parseProtocolFile(filePath, id));
        }
      } catch { /* skip unreadable files */ }
    }
  } catch { /* ignore directory errors */ }

  // Sort by category then name
  protocols.sort((a, b) => {
    const catOrder = ['Context Engineering', 'Quality Assurance', 'Testing', 'Execution', 'Agent Communication'];
    const ai = catOrder.indexOf(a.category);
    const bi = catOrder.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  cache = { data: protocols, ts: Date.now() };
  return protocols;
}
