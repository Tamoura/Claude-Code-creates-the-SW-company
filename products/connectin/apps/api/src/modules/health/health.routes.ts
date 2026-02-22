import { FastifyPluginAsync } from 'fastify';
import { sendSuccess } from '../../lib/response';

const startTime = Date.now();

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /csrf-token — generates a CSRF token for the double-submit cookie pattern
  fastify.get('/api/v1/csrf-token', async (_request, reply) => {
    const token = await reply.generateCsrf();
    return { token };
  });

  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                  uptime: { type: 'number' },
                  version: { type: 'string' },
                  database: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                  uptime: { type: 'number' },
                  version: { type: 'string' },
                  database: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      let dbStatus = 'disconnected';
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }

      let redisStatus = 'ok';
      try {
        await fastify.redis.get('__ping__');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        redisStatus = `error: ${message}`;
      }

      const uptimeSeconds = Math.floor(
        (Date.now() - startTime) / 1000
      );

      const isHealthy = dbStatus === 'connected' && redisStatus === 'ok';
      const statusCode = isHealthy ? 200 : 503;

      return sendSuccess(reply, {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: uptimeSeconds,
        version: process.env.npm_package_version || '0.1.0',
        database: dbStatus,
        redis: redisStatus,
      }, statusCode);
    }
  );
};

export default healthRoutes;
