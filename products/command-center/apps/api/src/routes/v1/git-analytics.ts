import type { FastifyInstance } from 'fastify';
import { getGitAnalytics } from '../../services/git-analytics.service.js';

export async function gitAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/git-analytics', async () => {
    return getGitAnalytics();
  });
}
