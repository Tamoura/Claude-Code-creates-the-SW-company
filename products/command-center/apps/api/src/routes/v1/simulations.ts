import type { FastifyInstance } from 'fastify';
import { getNewProductSimulation } from '../../services/simulations.service.js';

export async function simulationRoutes(fastify: FastifyInstance) {
  fastify.get('/simulations/new-product', async (_request, reply) => {
    try {
      const simulation = getNewProductSimulation();
      return { simulation };
    } catch (err) {
      fastify.log.error(err, 'Failed to generate simulation');
      return reply.status(500).send({
        error: 'Failed to generate simulation',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
