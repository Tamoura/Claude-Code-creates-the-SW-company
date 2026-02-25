import type { FastifyInstance } from 'fastify';
import { getSimulation, getNewProductSimulation, listAvailableWorkflows } from '../../services/simulations.service.js';

export async function simulationRoutes(fastify: FastifyInstance) {
  // List all available workflow types (driven by real YAML files)
  fastify.get('/simulations/workflows', async (_request, reply) => {
    try {
      const workflows = listAvailableWorkflows();
      return { workflows };
    } catch (err) {
      fastify.log.error(err, 'Failed to list workflows');
      return reply.status(500).send({
        error: 'Failed to list workflows',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Legacy route for backwards compatibility
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

  // Unified route — type param maps directly to a *-tasks.yml filename
  fastify.get<{ Querystring: { type?: string } }>(
    '/simulations',
    async (request, reply) => {
      try {
        const workflows = listAvailableWorkflows();
        const validIds = new Set(workflows.map((w) => w.id));
        const rawType = request.query.type ?? 'new-product';
        const workflowType = validIds.has(rawType) ? rawType : 'new-product';

        const simulation = getSimulation(workflowType);
        return { simulation, workflowType };
      } catch (err) {
        fastify.log.error(err, 'Failed to generate simulation');
        return reply.status(500).send({
          error: 'Failed to generate simulation',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );
}
