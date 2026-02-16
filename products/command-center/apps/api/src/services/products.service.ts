import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, normalize } from 'node:path';
import { repoPath } from './repo.service.js';

export interface DocInfo {
  filename: string;
  title: string;
  category: 'prd' | 'api' | 'architecture' | 'adr' | 'audit' | 'other';
  sizeBytes: number;
  lastModified: string;
}

export interface Product {
  name: string;
  displayName: string;
  phase: string;
  hasApi: boolean;
  hasWeb: boolean;
  hasDocker: boolean;
  hasCi: boolean;
  apiPort: number | null;
  webPort: number | null;
  description: string;
  lastModified: string;
  fileCount: number;
  docs: string[];
}

/** Scan products/ directory and build metadata for each product */
export function listProducts(): Product[] {
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  const entries = readdirSync(productsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => buildProductInfo(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getProduct(name: string): Product | null {
  const dir = repoPath('products', name);
  if (!existsSync(dir)) return null;
  return buildProductInfo(name);
}

/** List all docs for a product with metadata */
export function listProductDocs(productName: string): DocInfo[] {
  const productDir = repoPath('products', productName);
  if (!existsSync(productDir)) return [];

  const docs: DocInfo[] = [];
  const docsDir = join(productDir, 'docs');

  // Recursively scan docs/ directory
  if (existsSync(docsDir)) {
    collectDocs(docsDir, docsDir, docs);
  }

  // Include README.md from product root if it exists
  const readmePath = join(productDir, 'README.md');
  if (existsSync(readmePath)) {
    docs.push(buildDocInfo(readmePath, 'README.md'));
  }

  return docs.sort((a, b) => a.filename.localeCompare(b.filename));
}

/** Read raw markdown content of a specific doc */
export function getProductDoc(productName: string, filename: string): (DocInfo & { content: string }) | null {
  // Security: reject path traversal attempts
  if (filename.includes('..') || filename.startsWith('/')) return null;

  const productDir = repoPath('products', productName);
  if (!existsSync(productDir)) return null;

  // Determine the full path
  let fullPath: string;
  if (filename === 'README.md') {
    fullPath = join(productDir, 'README.md');
  } else {
    fullPath = join(productDir, 'docs', filename);
  }

  // Normalize and verify the resolved path stays within the product directory
  const resolved = resolve(fullPath);
  const allowedBase = resolve(productDir);
  if (!resolved.startsWith(allowedBase)) return null;

  if (!existsSync(resolved) || statSync(resolved).isDirectory()) return null;

  try {
    const content = readFileSync(resolved, 'utf-8');
    const info = buildDocInfo(resolved, filename);
    return { ...info, content };
  } catch {
    return null;
  }
}

function collectDocs(baseDir: string, currentDir: string, docs: DocInfo[]): void {
  try {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        collectDocs(baseDir, fullPath, docs);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        const relativeName = relative(baseDir, fullPath);
        docs.push(buildDocInfo(fullPath, relativeName));
      }
    }
  } catch { /* ignore unreadable directories */ }
}

function buildDocInfo(fullPath: string, filename: string): DocInfo {
  const stat = statSync(fullPath);
  const title = extractTitle(fullPath, filename);
  const category = categorizeDoc(filename);

  return {
    filename,
    title,
    category,
    sizeBytes: stat.size,
    lastModified: stat.mtime.toISOString(),
  };
}

function extractTitle(fullPath: string, filename: string): string {
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
  } catch { /* ignore */ }
  // Fallback to filename without extension
  return filename.replace(/\.[^.]+$/, '');
}

function categorizeDoc(filename: string): DocInfo['category'] {
  const normalized = normalize(filename).toLowerCase();
  const basename = normalized.split('/').pop() ?? '';

  if (normalized.includes('adrs/') || normalized.includes('adr/')) return 'adr';
  if (basename === 'prd.md') return 'prd';
  if (basename === 'api.md') return 'api';
  if (basename === 'architecture.md') return 'architecture';
  if (basename.includes('audit')) return 'audit';
  return 'other';
}

function buildProductInfo(name: string): Product {
  const dir = repoPath('products', name);
  const hasApi = existsSync(join(dir, 'apps', 'api'));
  const hasWeb = existsSync(join(dir, 'apps', 'web'));
  const hasDocker = existsSync(join(dir, 'docker-compose.yml'));

  // Check for CI workflow
  const ciPatterns = [
    repoPath('.github', 'workflows', `${name}-ci.yml`),
    repoPath('.github', 'workflows', `test-${name}.yml`),
  ];
  const hasCi = ciPatterns.some((p) => existsSync(p));

  // Read ports from package.json scripts or .env
  const { apiPort, webPort } = detectPorts(dir);

  // Read description from README or package.json
  const description = readDescription(dir, name);

  // Phase detection
  const phase = detectPhase(dir);

  // Docs listing
  const docs = listDocs(dir);

  // File count (approximate via top-level scan)
  const fileCount = countFiles(dir);

  // Last modified
  const lastModified = getLastModified(dir);

  return {
    name,
    displayName: name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
    phase,
    hasApi,
    hasWeb,
    hasDocker,
    hasCi,
    apiPort,
    webPort,
    description,
    lastModified,
    fileCount,
    docs,
  };
}

function detectPorts(dir: string): { apiPort: number | null; webPort: number | null } {
  let apiPort: number | null = null;
  let webPort: number | null = null;

  // Try API package.json dev script
  const apiPkg = join(dir, 'apps', 'api', 'package.json');
  if (existsSync(apiPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(apiPkg, 'utf-8'));
      const devScript = pkg.scripts?.dev ?? '';
      const portMatch = devScript.match(/(?:PORT=|--port\s+)(\d+)/);
      if (portMatch) apiPort = Number(portMatch[1]);
    } catch { /* ignore */ }
  }

  // Try .env or .env.example for PORT
  for (const envFile of ['.env', '.env.example']) {
    const envPath = join(dir, envFile);
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8');
        const portMatch = content.match(/^PORT=(\d+)/m);
        if (portMatch && !apiPort) apiPort = Number(portMatch[1]);
      } catch { /* ignore */ }
    }
  }

  // Try Web package.json or vite config
  const webPkg = join(dir, 'apps', 'web', 'package.json');
  if (existsSync(webPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(webPkg, 'utf-8'));
      const devScript = pkg.scripts?.dev ?? '';
      const portMatch = devScript.match(/--port\s+(\d+)/);
      if (portMatch) webPort = Number(portMatch[1]);
    } catch { /* ignore */ }
  }

  return { apiPort, webPort };
}

function readDescription(dir: string, name: string): string {
  const readmePath = join(dir, 'README.md');
  if (existsSync(readmePath)) {
    try {
      const content = readFileSync(readmePath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      if (lines.length > 0) return lines[0].trim().slice(0, 200);
    } catch { /* ignore */ }
  }

  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.description) return pkg.description;
    } catch { /* ignore */ }
  }

  return `${name} product`;
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

function listDocs(dir: string): string[] {
  const docsDir = join(dir, 'docs');
  if (!existsSync(docsDir)) return [];
  try {
    return readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else count++;
      }
    };
    walk(dir);
  } catch { /* ignore */ }
  return count;
}

function getLastModified(dir: string): string {
  try {
    return statSync(dir).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
