import type { FastifyInstance } from 'fastify';
import { getProductProgress } from '../../services/progress.service.js';

export async function progressRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { name: string } }>(
    '/products/:name/progress',
    async (request, reply) => {
      const progress = getProductProgress(request.params.name);
      if (!progress) {
        return reply
          .status(404)
          .send({ error: 'Product not found or no progress data' });
      }
      return progress;
    },
  );
}
