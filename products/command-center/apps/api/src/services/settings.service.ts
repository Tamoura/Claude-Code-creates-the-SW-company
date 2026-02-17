import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { repoPath, repoRoot } from './repo.service.js';

export interface PortEntry {
  product: string;
  frontendPort: number | null;
  backendPort: number | null;
}

export interface AgentEntry {
  id: string;
  name: string;
  hasExperience: boolean;
}

export interface ProductEntry {
  name: string;
  phase: string;
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  gitBranch: string;
}

export interface Settings {
  ports: PortEntry[];
  agents: AgentEntry[];
  products: ProductEntry[];
  system: SystemInfo;
}

export interface AgentDefinition {
  id: string;
  name: string;
  filePath: string;
  hasBrief: boolean;
}

export function getSettings(): Settings {
  return {
    ports: buildPortEntries(),
    agents: buildAgentEntries(),
    products: buildProductEntries(),
    system: buildSystemInfo(),
  };
}

export function getAgentDefinitions(): AgentDefinition[] {
  return loadAgentList();
}

function buildPortEntries(): PortEntry[] {
  const registry = loadPortRegistry();
  const productMap = new Map<string, PortEntry>();

  for (const fe of registry.frontend) {
    const entry = productMap.get(fe.product) ?? { product: fe.product, frontendPort: null, backendPort: null };
    entry.frontendPort = fe.port;
    productMap.set(fe.product, entry);
  }

  for (const be of registry.backend) {
    const entry = productMap.get(be.product) ?? { product: be.product, frontendPort: null, backendPort: null };
    entry.backendPort = be.port;
    productMap.set(be.product, entry);
  }

  return Array.from(productMap.values()).sort((a, b) => a.product.localeCompare(b.product));
}

function buildAgentEntries(): AgentEntry[] {
  const agents = loadAgentList();
  const expDir = repoPath('.claude', 'memory', 'agent-experiences');

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    hasExperience: existsSync(join(expDir, `${a.id}.json`)),
  }));
}

function buildProductEntries(): ProductEntry[] {
  const products = loadProductList();
  return products.map((name) => ({
    name,
    phase: detectProductPhase(name),
  }));
}

function detectProductPhase(name: string): string {
  const dir = repoPath('products', name);
  const hasTests = existsSync(join(dir, 'apps', 'api', 'tests'));
  const hasE2e = existsSync(join(dir, 'e2e'));
  const hasDocs = existsSync(join(dir, 'docs', 'PRD.md'));
  const hasDocker = existsSync(join(dir, 'docker-compose.yml'));

  if (hasTests && hasE2e && hasDocker && hasDocs) return 'Production';
  if (hasTests && hasDocker) return 'MVP';
  if (existsSync(join(dir, 'apps', 'api', 'src')) || existsSync(join(dir, 'apps', 'web', 'src'))) return 'Foundation';
  return 'Planned';
}

function buildSystemInfo(): SystemInfo {
  let gitBranch = 'unknown';
  try {
    gitBranch = execSync('git branch --show-current', {
      cwd: repoRoot(),
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
  } catch { /* ignore */ }

  return {
    version: '1.0.0',
    nodeVersion: process.version,
    gitBranch,
  };
}

interface PortAssignment {
  port: number;
  product: string;
  status: string;
}

interface PortRegistry {
  frontend: PortAssignment[];
  backend: PortAssignment[];
}

function loadPortRegistry(): PortRegistry {
  const registryPath = repoPath('.claude', 'PORT-REGISTRY.md');
  if (!existsSync(registryPath)) {
    return { frontend: [], backend: [] };
  }

  try {
    const content = readFileSync(registryPath, 'utf-8');
    return parsePortRegistry(content);
  } catch {
    return { frontend: [], backend: [] };
  }
}

function parsePortRegistry(content: string): PortRegistry {
  const frontend: PortAssignment[] = [];
  const backend: PortAssignment[] = [];

  let inFrontend = false;
  let inBackend = false;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('Frontend Applications')) {
      inFrontend = true;
      inBackend = false;
      continue;
    }
    if (line.includes('Backend APIs')) {
      inFrontend = false;
      inBackend = true;
      continue;
    }
    if (line.includes('Mobile Development') || line.includes('Databases')) {
      inFrontend = false;
      inBackend = false;
      continue;
    }

    const rowMatch = line.match(/\|\s*(\d{4})\s*\|\s*(.+?)\s*\|\s*(\w+)\s*\|/);
    if (rowMatch) {
      const port = parseInt(rowMatch[1], 10);
      const product = rowMatch[2].trim();
      const status = rowMatch[3].trim();

      if (product.includes('Available')) continue;

      const assignment: PortAssignment = { port, product, status };
      if (inFrontend) frontend.push(assignment);
      else if (inBackend) backend.push(assignment);
    }
  }

  return { frontend, backend };
}

function loadAgentList(): AgentDefinition[] {
  const agentsDir = repoPath('.claude', 'agents');
  if (!existsSync(agentsDir)) return [];

  try {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
    return files.map((f) => {
      const id = f.replace('.md', '');
      const filePath = `.claude/agents/${f}`;
      const briefPath = repoPath('.claude', 'agents', 'briefs', f);
      const hasBrief = existsSync(briefPath);

      let name = id
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      try {
        const content = readFileSync(repoPath('.claude', 'agents', f), 'utf-8');
        const nameMatch = content.match(/^#\s+(.+)/m);
        if (nameMatch) name = nameMatch[1].trim();
      } catch { /* ignore */ }

      return { id, name, filePath, hasBrief };
    }).sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

function loadProductList(): string[] {
  const productsDir = repoPath('products');
  if (!existsSync(productsDir)) return [];

  try {
    return readdirSync(productsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}
