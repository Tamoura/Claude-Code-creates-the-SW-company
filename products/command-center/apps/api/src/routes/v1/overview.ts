import type { FastifyInstance } from 'fastify';
import { listProducts } from '../../services/products.service.js';
import { getAuditTrail, getRecentCommits } from '../../services/activity.service.js';
import { listPackages } from '../../services/components.service.js';
import { listAgents } from '../../services/agents.service.js';

export async function overviewRoutes(fastify: FastifyInstance) {
  fastify.get('/overview', async () => {
    const products = listProducts();
    const packages = listPackages();
    const agents = listAgents();
    const recentAudit = getAuditTrail(5);
    const recentCommits = getRecentCommits(5);

    const phaseBreakdown: Record<string, number> = {};
    for (const p of products) {
      phaseBreakdown[p.phase] = (phaseBreakdown[p.phase] ?? 0) + 1;
    }

    return {
      company: 'ConnectSW',
      stats: {
        totalProducts: products.length,
        totalPackages: packages.length,
        totalAgents: agents.length,
        totalFiles: products.reduce((sum, p) => sum + p.fileCount, 0),
        productsWithApi: products.filter((p) => p.hasApi).length,
        productsWithWeb: products.filter((p) => p.hasWeb).length,
        productsWithCi: products.filter((p) => p.hasCi).length,
      },
      phaseBreakdown,
      recentAudit,
      recentCommits,
    };
  });
}
