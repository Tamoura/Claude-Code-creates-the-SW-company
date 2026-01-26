import { FastifyPluginAsync } from 'fastify';

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
};

export default healthRoute;
