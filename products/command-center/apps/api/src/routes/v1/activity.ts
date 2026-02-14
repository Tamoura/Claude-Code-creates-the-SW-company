import type { FastifyInstance } from 'fastify';
import { getAuditTrail, getRecentCommits, getActivityFeed } from '../../services/activity.service.js';

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { limit?: string } }>('/activity', async (request) => {
    const limit = Math.min(Number(request.query.limit ?? 30), 100);
    return { activity: getActivityFeed(limit) };
  });

  fastify.get<{ Querystring: { limit?: string } }>('/activity/audit', async (request) => {
    const limit = Math.min(Number(request.query.limit ?? 50), 200);
    return { entries: getAuditTrail(limit) };
  });

  fastify.get<{ Querystring: { limit?: string } }>('/activity/commits', async (request) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50);
    return { commits: getRecentCommits(limit) };
  });
}
