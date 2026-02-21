import { FastifyPluginAsync } from 'fastify';
import { sendSuccess, sendError } from '../../lib/response';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'disconnected';
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'connected';

    if (!isHealthy) {
      return sendError(reply, 503, 'SERVICE_UNAVAILABLE', 'Service degraded', [
        { field: 'database', message: dbStatus },
      ]);
    }

    return sendSuccess(reply, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  });
};

export default healthRoutes;
