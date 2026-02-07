import { FastifyPluginAsync } from 'fastify';
import { MetricsService } from './service.js';
import { MetricsHandlers } from './handlers.js';

const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new MetricsService(fastify.prisma);
  const handlers = new MetricsHandlers(service);

  // All routes require authentication
  fastify.addHook('onRequest', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
  });

  /**
   * GET /api/v1/metrics/velocity
   * Team velocity metrics: PR merge rate, cycle time, review time.
   */
  fastify.get('/velocity', async (request, reply) => {
    return handlers.getVelocity(request, reply);
  });

  /**
   * GET /api/v1/metrics/coverage
   * Test coverage metrics per repo with trends.
   */
  fastify.get('/coverage', async (request, reply) => {
    return handlers.getCoverage(request, reply);
  });

  /**
   * GET /api/v1/metrics/summary
   * Aggregated summary of all metrics for dashboard.
   */
  fastify.get('/summary', async (request, reply) => {
    return handlers.getSummary(request, reply);
  });

  /**
   * POST /api/v1/metrics/aggregate
   * Trigger metric aggregation and store snapshots.
   */
  fastify.post('/aggregate', async (request, reply) => {
    return handlers.runAggregation(request, reply);
  });
};

export default metricsRoutes;
