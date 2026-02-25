import type { FastifyInstance } from 'fastify';
import { getSimulation, getNewProductSimulation, type WorkflowType } from '../../services/simulations.service.js';

const VALID_WORKFLOW_TYPES: WorkflowType[] = [
  'new-product',
  'new-feature',
  'bug-fix',
  'architecture-review',
  'security-audit',
];

export async function simulationRoutes(fastify: FastifyInstance) {
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

  // Unified route with type query parameter
  fastify.get<{ Querystring: { type?: string } }>(
    '/simulations',
    async (request, reply) => {
      try {
        const rawType = request.query.type ?? 'new-product';
        const workflowType: WorkflowType = VALID_WORKFLOW_TYPES.includes(rawType as WorkflowType)
          ? (rawType as WorkflowType)
          : 'new-product';
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
