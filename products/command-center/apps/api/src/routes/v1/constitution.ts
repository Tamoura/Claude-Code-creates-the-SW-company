import type { FastifyInstance } from 'fastify';
import { getConstitution } from '../../services/constitution.service.js';

export async function constitutionRoutes(fastify: FastifyInstance) {
  fastify.get('/constitution', async () => {
    return getConstitution();
  });
}
