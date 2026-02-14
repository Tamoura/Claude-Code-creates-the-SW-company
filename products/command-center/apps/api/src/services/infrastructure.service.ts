import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { repoPath } from './repo.service.js';

export interface PortAssignment {
  product: string;
  frontendPort: number | null;
  backendPort: number | null;
}

export interface CiPipeline {
  name: string;
  product: string;
  filename: string;
}

export interface InfrastructureOverview {
  ports: PortAssignment[];
  pipelines: CiPipeline[];
  totalFrontendPorts: number;
  totalBackendPorts: number;
  availableFrontendPorts: number;
  availableBackendPorts: number;
}

/** Parse PORT-REGISTRY.md for port assignments */
export function getPortAssignments(): PortAssignment[] {
  const registryPath = repoPath('.claude', 'PORT-REGISTRY.md');
  if (!existsSync(registryPath)) return [];

  try {
    const content = readFileSync(registryPath, 'utf-8');
    const assignments: PortAssignment[] = [];

    // Parse table rows matching "| product | port |" patterns
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\|\s*(\S+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
      if (match) {
        assignments.push({
          product: match[1],
          frontendPort: Number(match[2]),
          backendPort: Number(match[3]),
        });
      }
    }

    // If table format doesn't match, try scanning for port numbers alongside product names
    if (assignments.length === 0) {
      const portRegex = /(\w[\w-]+)\s*.*?(\d{4})/g;
      let m;
      while ((m = portRegex.exec(content)) !== null) {
        const port = Number(m[2]);
        if (port >= 3100 && port <= 3199) {
          const existing = assignments.find((a) => a.product === m[1]);
          if (existing) existing.frontendPort = port;
          else assignments.push({ product: m[1], frontendPort: port, backendPort: null });
        } else if (port >= 5000 && port <= 5099) {
          const existing = assignments.find((a) => a.product === m[1]);
          if (existing) existing.backendPort = port;
          else assignments.push({ product: m[1], frontendPort: null, backendPort: port });
        }
      }
    }

    return assignments;
  } catch {
    return [];
  }
}

/** List CI/CD pipelines */
export function getCiPipelines(): CiPipeline[] {
  const workflowsDir = repoPath('.github', 'workflows');
  if (!existsSync(workflowsDir)) return [];

  try {
    return readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map((f) => {
        const product = f.replace(/^(test-|ci-)|(-ci|-test)\.ya?ml$/g, '').replace('.yml', '').replace('.yaml', '');
        return { name: f, product, filename: f };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Get full infrastructure overview */
export function getInfrastructureOverview(): InfrastructureOverview {
  const ports = getPortAssignments();
  const pipelines = getCiPipelines();
  const usedFrontend = ports.filter((p) => p.frontendPort).length;
  const usedBackend = ports.filter((p) => p.backendPort).length;

  return {
    ports,
    pipelines,
    totalFrontendPorts: usedFrontend,
    totalBackendPorts: usedBackend,
    availableFrontendPorts: 100 - usedFrontend,
    availableBackendPorts: 100 - usedBackend,
  };
}
