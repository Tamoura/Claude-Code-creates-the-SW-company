import type { FastifyInstance } from 'fastify';
import { listAgents, getAgentDetail } from '../../services/agents.service.js';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.get('/agents', async () => {
    return { agents: listAgents() };
  });

  fastify.get<{ Params: { id: string } }>('/agents/:id', async (request, reply) => {
    const agent = getAgentDetail(request.params.id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return { agent };
  });
}
