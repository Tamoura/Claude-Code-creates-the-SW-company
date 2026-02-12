import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });
};

export default healthRoutes;
