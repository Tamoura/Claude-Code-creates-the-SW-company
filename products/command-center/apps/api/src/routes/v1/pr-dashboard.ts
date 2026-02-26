import type { FastifyInstance } from 'fastify';
import { getPRDashboard } from '../../services/pr-dashboard.service.js';

export async function prDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/pr-dashboard', async (_request, reply) => {
    try {
      const data = getPRDashboard();
      return data;
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch PR dashboard');
      return reply.status(500).send({
        error: 'Failed to fetch PR dashboard',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
