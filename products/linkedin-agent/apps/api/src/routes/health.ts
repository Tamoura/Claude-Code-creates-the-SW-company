import { FastifyPluginAsync } from 'fastify';

const startedAt = new Date();

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'connected';
    let dbLatencyMs: number | null = null;

    try {
      const start = Date.now();
      await fastify.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'disconnected';
    }

    const statusCode = dbStatus === 'connected' ? 200 : 503;
    const mem = process.memoryUsage();

    reply.header('Cache-Control', 'no-cache');

    return reply.code(statusCode).send({
      status: dbStatus === 'connected' ? 'ok' : 'error',
      service: 'linkedin-agent-api',
      database: dbStatus,
      dbLatencyMs,
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      startedAt: startedAt.toISOString(),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
      },
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    let dbStatus = 'connected';

    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    const statusCode = dbStatus === 'connected' ? 200 : 503;

    return reply.code(statusCode).send({
      status: dbStatus === 'connected' ? 'ready' : 'not_ready',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });
};

export default healthRoutes;
