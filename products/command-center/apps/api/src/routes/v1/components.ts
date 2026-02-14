import type { FastifyInstance } from 'fastify';
import { listPackages, getComponentStats } from '../../services/components.service.js';

export async function componentRoutes(fastify: FastifyInstance) {
  fastify.get('/components', async () => {
    return getComponentStats();
  });

  fastify.get('/components/packages', async () => {
    return { packages: listPackages() };
  });
}
