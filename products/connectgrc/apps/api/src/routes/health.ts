import { FastifyPluginAsync } from 'fastify';

const startTime = Date.now();

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'connected';

    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    const statusCode = dbStatus === 'connected' ? 200 : 503;

    return reply.code(statusCode).send({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      version: '0.1.0',
      uptime,
      database: dbStatus,
    });
  });
};

export default healthRoutes;
