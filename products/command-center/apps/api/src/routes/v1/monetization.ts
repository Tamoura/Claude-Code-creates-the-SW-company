import type { FastifyInstance } from 'fastify';
import { getMonetizationData, updateProduct } from '../../services/monetization.service.js';
import type { MonetizationProduct } from '../../services/monetization.service.js';

export async function monetizationRoutes(fastify: FastifyInstance) {
  fastify.get('/monetization', async () => {
    return getMonetizationData();
  });

  fastify.patch<{ Params: { id: string }; Body: Partial<MonetizationProduct> }>(
    '/monetization/:id',
    async (request, reply) => {
      try {
        const updated = updateProduct(request.params.id, request.body);
        return { product: updated };
      } catch (err) {
        return reply.status(404).send({
          error: 'Not found',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );
}
