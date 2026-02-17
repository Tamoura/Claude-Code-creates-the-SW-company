import type { FastifyInstance } from 'fastify';
import { getDependencyGraph } from '../../services/dependency-graph.service.js';

export async function dependencyGraphRoutes(fastify: FastifyInstance) {
  fastify.get('/dependency-graph', async () => {
    return getDependencyGraph();
  });
}
