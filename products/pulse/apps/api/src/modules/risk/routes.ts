import { FastifyPluginAsync } from 'fastify';
import { RiskService } from './service.js';
import { RiskHandlers } from './handlers.js';

const riskRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new RiskService(fastify.prisma);
  const handlers = new RiskHandlers(service);

  // All routes require authentication
  fastify.addHook('onRequest', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
  });

  /**
   * GET /api/v1/risk/current
   * Compute and return current sprint risk score.
   */
  fastify.get('/current', async (request, reply) => {
    return handlers.getCurrent(request, reply);
  });

  /**
   * GET /api/v1/risk/history
   * Retrieve historical risk snapshots.
   */
  fastify.get('/history', async (request, reply) => {
    return handlers.getHistory(request, reply);
  });
};

export default riskRoutes;
