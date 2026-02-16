import type { FastifyInstance } from 'fastify';
import { listWorkflows, getWorkflow } from '../../services/workflows.service.js';

export async function workflowRoutes(fastify: FastifyInstance) {
  fastify.get('/workflows', async () => {
    return { workflows: listWorkflows() };
  });

  fastify.get<{ Params: { id: string } }>('/workflows/:id', async (request, reply) => {
    const workflow = getWorkflow(request.params.id);
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return { workflow };
  });
}
