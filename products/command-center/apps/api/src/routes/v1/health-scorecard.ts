import type { FastifyInstance } from 'fastify';
import { getHealthScorecard } from '../../services/health-scorecard.service.js';

export async function healthScorecardRoutes(fastify: FastifyInstance) {
  fastify.get('/health-scorecard', async () => {
    return { products: getHealthScorecard() };
  });
}
