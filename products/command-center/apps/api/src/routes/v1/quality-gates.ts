import type { FastifyInstance } from 'fastify';
import { getQualityGates } from '../../services/quality-gates.service.js';

export async function qualityGatesRoutes(fastify: FastifyInstance) {
  fastify.get('/quality-gates', async () => {
    return { products: getQualityGates() };
  });
}
