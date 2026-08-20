/**
 * Liveness / readiness probe.
 *
 * Returns 503 when PostgreSQL is unreachable — Postgres is the sole source of
 * truth (ADR-004/007/009), so an API that cannot reach it is not serving.
 * Redis being down is DEGRADED, not unhealthy (FR-045).
 */
import type { FastifyPluginAsync } from 'fastify';

const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    database: { type: 'string' },
    redis: { type: 'string' },
    uptime: { type: 'number' },
    timestamp: { type: 'string' },
    version: { type: 'string' },
  },
} as const;

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check with PostgreSQL and Redis status',
        tags: ['System'],
        response: { 200: healthResponseSchema, 503: healthResponseSchema },
      },
    },
    async (_request, reply) => {
      let database = 'disconnected';
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        database = 'connected';
      } catch {
        database = 'disconnected';
      }

      let redis = 'not_configured';
      if (fastify.redis) {
        try {
          await fastify.redis.ping();
          redis = 'connected';
        } catch {
          redis = 'disconnected';
        }
      }

      const healthy = database === 'connected';
      const degraded = healthy && redis === 'disconnected';

      return reply.status(healthy ? 200 : 503).send({
        status: healthy ? (degraded ? 'degraded' : 'ok') : 'unhealthy',
        database,
        redis,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.1.0',
      });
    }
  );

  // Kubernetes-style split probes; both are cheap and dependency-free.
  fastify.get('/health/live', async () => ({ status: 'ok' }));
};

export default healthRoutes;
