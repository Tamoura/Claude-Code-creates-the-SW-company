import type { FastifyInstance } from 'fastify';
import { listAgents, getAgent } from '../../services/agents.service.js';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.get('/agents', async () => {
    return { agents: listAgents() };
  });

  fastify.get<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const agent = getAgent(request.params.id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return { agent };
  });
}
