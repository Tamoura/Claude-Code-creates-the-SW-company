import type { FastifyInstance } from 'fastify';
import { getOperationsGuide } from '../../services/operations.service.js';

export async function operationsRoutes(fastify: FastifyInstance) {
  fastify.get('/operations', async () => {
    return getOperationsGuide();
  });
}
