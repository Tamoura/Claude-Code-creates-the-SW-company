import { FastifyPluginAsync } from 'fastify';
import { sendSuccess } from '../../lib/response';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'disconnected';
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return sendSuccess(reply, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  });
};

export default healthRoutes;
