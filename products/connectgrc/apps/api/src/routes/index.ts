import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';

const routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
};

export default routes;
