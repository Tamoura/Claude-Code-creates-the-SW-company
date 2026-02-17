import type { FastifyInstance } from 'fastify';
import { getKnowledgeBase, searchKnowledgeBase } from '../../services/knowledge-base.service.js';

export async function knowledgeBaseRoutes(fastify: FastifyInstance) {
  fastify.get('/knowledge-base', async () => {
    return getKnowledgeBase();
  });

  fastify.get<{ Querystring: { q?: string } }>('/knowledge-base/search', async (request, reply) => {
    const q = request.query.q?.trim();
    if (!q) {
      return reply.status(400).send({ error: 'Query parameter "q" is required' });
    }
    return { query: q, results: searchKnowledgeBase(q) };
  });
}
