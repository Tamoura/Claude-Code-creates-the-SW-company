/**
 * Health Check Endpoint
 * Implements: NFR-013 (Health Check Monitoring)
 *
 * Returns comprehensive system status including database
 * and Redis connectivity. Returns 503 when database is
 * unreachable (critical dependency).
 */
import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get(
      '/health',
      {
        schema: {
          description:
            'Health check endpoint with DB and Redis status',
          tags: ['System'],
          response: {
            200: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                database: { type: 'string' },
                redis: { type: 'string' },
                uptime: { type: 'number' },
                timestamp: { type: 'string' },
                version: { type: 'string' },
              },
            },
            503: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                database: { type: 'string' },
                redis: { type: 'string' },
                uptime: { type: 'number' },
                timestamp: { type: 'string' },
                version: { type: 'string' },
              },
            },
          },
        },
      },
      async (_request, reply) => {
        // Check database connectivity
        let dbStatus = 'disconnected';
        try {
          await fastify.prisma.$queryRaw`SELECT 1`;
          dbStatus = 'connected';
        } catch {
          dbStatus = 'disconnected';
        }

        // Check Redis connectivity
        let redisStatus = 'disconnected';
        try {
          if (fastify.redis) {
            // RedisLike interface uses get/set; use a
            // no-op get to verify the store is reachable
            await fastify.redis.get('__health_check__');
            redisStatus = 'connected';
          }
        } catch {
          redisStatus = 'disconnected';
        }

        const isHealthy = dbStatus === 'connected';
        const statusCode = isHealthy ? 200 : 503;

        return reply.status(statusCode).send({
          status: isHealthy ? 'ok' : 'degraded',
          database: dbStatus,
          redis: redisStatus,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version:
            process.env.npm_package_version || '0.1.0',
        });
      }
    );
  };

export default healthRoutes;
