import type { FastifyInstance } from 'fastify';
import { listProducts } from '../../services/products.service.js';
import { getRecentCommits } from '../../services/activity.service.js';
import { listPackages } from '../../services/components.service.js';
import { listAgents } from '../../services/agents.service.js';
import { getQualityGates } from '../../services/quality-gates.service.js';
import { getAlerts } from '../../services/alerts.service.js';

export async function overviewRoutes(fastify: FastifyInstance) {
  fastify.get('/overview', async () => {
    const products = listProducts();
    const packages = listPackages();
    const agents = listAgents();
    const recentCommits = getRecentCommits(5);
    const qualityProducts = getQualityGates();
    const allAlerts = getAlerts();

    const phaseBreakdown: Record<string, number> = {};
    for (const p of products) {
      phaseBreakdown[p.phase] = (phaseBreakdown[p.phase] ?? 0) + 1;
    }

    // Avg quality score from audited products
    const audited = qualityProducts.filter((p) => p.hasAudit);
    const avgQualityScore = audited.length > 0
      ? Math.round((audited.reduce((s, p) => s + p.overallScore, 0) / audited.length) * 10) / 10
      : null;

    // Active alerts (critical/warning, max 5)
    const activeAlerts = allAlerts
      .filter((a) => a.severity === 'critical' || a.severity === 'warning')
      .slice(0, 5);

    // Product health matrix: products with key health indicators
    const productHealthMatrix = products.slice(0, 8).map((p) => {
      const quality = qualityProducts.find((q) => q.name === p.name);
      return {
        name: p.name,
        phase: p.phase,
        hasApi: p.hasApi,
        hasCi: p.hasCi,
        qualityScore: quality?.hasAudit ? quality.overallScore : null,
      };
    });

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
        avgQualityScore,
        openAlerts: allAlerts.length,
      },
      phaseBreakdown,
      activeAlerts,
      recentCommits,
      productHealthMatrix,
    };
  });
}
