import type { FastifyPluginAsync } from 'fastify';

/**
 * Liveness and readiness. The Production Gate polls /api/v1/health and expects
 * `database: "up"` before a deploy is allowed to proceed.
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let database = 'up';
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return reply.code(database === 'up' ? 200 : 503).send({
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptime: Math.round(process.uptime()),
    });
  });
};

export default healthRoutes;
