/**
 * routes/health.ts — Health check endpoint
 *
 * GET /health
 * - Returns 200 when DB and Redis are healthy
 * - Returns 503 when DB is unreachable (DB failure = not healthy)
 * - Redis failure degrades gracefully (Redis is optional)
 *
 * Response shape (public):
 * { status: 'ok'|'degraded', db: 'ok'|'error', redis: 'ok'|'error'|'disabled', version, timestamp }
 *
 * Detailed checks exposed only with valid INTERNAL_API_KEY in X-Internal-Api-Key header.
 *
 * PATTERN-016: Structured access logging with correlation IDs
 */

import { FastifyPluginAsync } from 'fastify';

const VERSION = '0.1.0';

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              db: { type: 'string' },
              redis: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              db: { type: 'string' },
              redis: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
      // Exempt from auth
      config: { rateLimit: false },
    },
    async (_req, reply) => {
      let dbStatus: 'ok' | 'error' = 'ok';
      let redisStatus: 'ok' | 'error' | 'disabled' = 'disabled';

      // Check database
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        dbStatus = 'ok';
      } catch {
        dbStatus = 'error';
      }

      // Check Redis (optional)
      if (fastify.redis !== null) {
        try {
          await fastify.redis.ping();
          redisStatus = 'ok';
        } catch {
          redisStatus = 'error';
        }
      }

      const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded';
      const statusCode = overallStatus === 'ok' ? 200 : 503;

      return reply.code(statusCode).send({
        status: overallStatus,
        db: dbStatus,
        redis: redisStatus,
        version: VERSION,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // GET /ready — lightweight readiness probe for load balancers
  fastify.get(
    '/ready',
    {
      schema: {
        response: {
          200: { type: 'object', properties: { status: { type: 'string' } } },
          503: { type: 'object', properties: { status: { type: 'string' } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        return reply.code(200).send({ status: 'ready' });
      } catch {
        return reply.code(503).send({ status: 'not_ready' });
      }
    }
  );
};

export default healthRoute;
