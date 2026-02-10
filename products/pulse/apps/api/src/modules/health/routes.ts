import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {};
    let overallStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';

    // Check database
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      overallStatus = 'unhealthy';
    }

    // Check Redis
    if (fastify.redis) {
      try {
        await fastify.redis.ping();
        checks.redis = 'ok';
      } catch {
        checks.redis = 'error';
        overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } else {
      checks.redis = 'unavailable';
    }

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

    return reply.code(statusCode).send({
      status: overallStatus,
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      checks,
    });
  });
};

export default healthRoutes;
