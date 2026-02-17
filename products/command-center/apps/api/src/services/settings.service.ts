import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { repoPath } from './repo.service.js';

export interface PortAssignment {
  port: number;
  product: string;
  status: string;
}

export interface PortRegistry {
  frontend: PortAssignment[];
  backend: PortAssignment[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  filePath: string;
  hasBrief: boolean;
}

export interface Settings {
  ports: PortRegistry;
  agents: AgentDefinition[];
  products: string[];
}

export function getSettings(): Settings {
  return {
    ports: loadPortRegistry(),
    agents: loadAgentList(),
    products: loadProductList(),
  };
}

export function getAgentDefinitions(): AgentDefinition[] {
  return loadAgentList();
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

  // Parse table rows: | Port | Product | Status | URL |
  const portRegex = /\|\s*(\d{4})\s*\|\s*(.+?)\s*\|\s*(\w+)\s*\|/g;
  let match: RegExpExecArray | null;

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

      // Extract name from first heading
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
