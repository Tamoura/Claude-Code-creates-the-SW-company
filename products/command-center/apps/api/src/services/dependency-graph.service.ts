import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface GraphNode {
  id: string;
  label: string;
  type: 'product' | 'package' | 'agent';
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Cache with 60s TTL */
let cache: { data: DependencyGraph; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function getDependencyGraph(): DependencyGraph {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const sharedDeps = new Map<string, string[]>();

  // Scan products
  const productsDir = repoPath('products');
  if (existsSync(productsDir)) {
    const products = readdirSync(productsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const product of products) {
      nodes.push({ id: `product:${product}`, label: product, type: 'product', group: 'product' });
      collectDependencies(product, sharedDeps);
    }
  }

  // Build package nodes and dependency edges
  for (const [pkg, dependents] of sharedDeps.entries()) {
    if (dependents.length > 1) {
      const pkgId = `package:${pkg}`;
      nodes.push({ id: pkgId, label: pkg, type: 'package', group: 'package' });
      for (const product of dependents) {
        edges.push({
          source: `product:${product}`,
          target: pkgId,
          label: 'depends-on',
        });
      }
    }
  }

  // Scan agent briefs for product associations
  const briefsDir = repoPath('.claude', 'agents', 'briefs');
  if (existsSync(briefsDir)) {
    const briefs = readdirSync(briefsDir)
      .filter((f) => f.endsWith('.md'));

    for (const brief of briefs) {
      const agentId = brief.replace('.md', '');
      const agentNodeId = `agent:${agentId}`;
      nodes.push({ id: agentNodeId, label: agentId, type: 'agent', group: 'agent' });

      const associations = findAgentProductAssociations(
        join(briefsDir, brief),
        nodes.filter((n) => n.type === 'product').map((n) => n.label),
      );
      for (const product of associations) {
        edges.push({
          source: agentNodeId,
          target: `product:${product}`,
          label: 'works-on',
        });
      }
    }
  }

  const data: DependencyGraph = { nodes, edges };
  cache = { data, ts: Date.now() };
  return data;
}

function collectDependencies(
  product: string,
  sharedDeps: Map<string, string[]>,
): void {
  const pkgPaths = [
    repoPath('products', product, 'package.json'),
    repoPath('products', product, 'apps', 'api', 'package.json'),
    repoPath('products', product, 'apps', 'web', 'package.json'),
  ];

  for (const pkgPath of pkgPaths) {
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const dep of Object.keys(allDeps)) {
        // Only track notable framework/lib deps, not every tiny package
        if (isNotableDependency(dep)) {
          const existing = sharedDeps.get(dep) ?? [];
          if (!existing.includes(product)) {
            existing.push(product);
          }
          sharedDeps.set(dep, existing);
        }
      }
    } catch { /* ignore */ }
  }
}

function isNotableDependency(dep: string): boolean {
  const notable = [
    'fastify', 'next', 'react', 'prisma', '@prisma/client',
    'tailwindcss', 'typescript', 'zod', 'ethers', 'playwright',
    'jest', 'vitest', 'vite', '@tanstack/react-query', 'express',
    '@fastify/cors', '@fastify/jwt', 'bcrypt', 'bcryptjs',
    'pino', 'pino-pretty', 'dotenv', 'stripe',
  ];
  return notable.includes(dep);
}

function findAgentProductAssociations(
  briefPath: string,
  productNames: string[],
): string[] {
  try {
    const content = readFileSync(briefPath, 'utf-8').toLowerCase();
    return productNames.filter((name) => content.includes(name.toLowerCase()));
  } catch {
    return [];
  }
}
