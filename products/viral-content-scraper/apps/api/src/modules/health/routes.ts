import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /api/v1/health — Liveness probe
  fastify.get('/', async (request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET /api/v1/health/ready — Readiness probe (checks DB)
  fastify.get('/ready', async (request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'ready',
        database: 'connected',
        redis: fastify.redis ? 'connected' : 'not configured',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return reply.status(503).send({ status: 'not ready', database: 'disconnected' });
    }
  });
}
