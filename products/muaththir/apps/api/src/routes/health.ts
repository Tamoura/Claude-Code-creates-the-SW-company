import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'connected';

    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    const statusCode = dbStatus === 'connected' ? 200 : 503;

    return reply.code(statusCode).send({
      status: dbStatus === 'connected' ? 'ok' : 'error',
      database: dbStatus,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe for Kubernetes / container orchestration
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
