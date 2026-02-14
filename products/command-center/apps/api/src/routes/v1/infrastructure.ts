import type { FastifyInstance } from 'fastify';
import { getInfrastructureOverview } from '../../services/infrastructure.service.js';

export async function infrastructureRoutes(fastify: FastifyInstance) {
  fastify.get('/infrastructure', async () => {
    return getInfrastructureOverview();
  });
}
