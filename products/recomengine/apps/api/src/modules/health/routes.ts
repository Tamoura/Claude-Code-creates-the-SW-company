import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  fastify.get('/ready', async (request, reply) => {
    const checks: Record<string, string> = {};

    // Check database
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
    }

    // Check Redis
    try {
      if (fastify.redis) {
        await fastify.redis.ping();
        checks.redis = 'connected';
      } else {
        checks.redis = 'disconnected';
      }
    } catch {
      checks.redis = 'disconnected';
    }

    const isReady = checks.database === 'connected';
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      status: isReady ? 'ready' : 'not_ready',
      checks,
    });
  });
}
