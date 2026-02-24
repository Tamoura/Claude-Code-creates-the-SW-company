import { FastifyPluginAsync } from 'fastify';
import { AdvancedSearchService } from './advanced-search.service';
import { sendSuccess, sendError } from '../../lib/response';

const advancedSearchRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new AdvancedSearchService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/search/advanced?type=people|jobs&q=...&location=...&workType=...&experienceLevel=...
  fastify.get('/', {
    schema: {
      description: 'Advanced search with filters for people and jobs',
      tags: ['Search'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          type: { type: 'string', enum: ['people', 'jobs'] },
          location: { type: 'string' },
          workType: { type: 'string', enum: ['ONSITE', 'HYBRID', 'REMOTE'] },
          experienceLevel: { type: 'string', enum: ['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'] },
          company: { type: 'string' },
          page: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const query = request.query as any;

    if (!query.q?.trim()) {
      return sendError(reply, 400, 'BAD_REQUEST', 'Query parameter "q" is required');
    }
    if (!query.type) {
      return sendError(reply, 400, 'BAD_REQUEST', 'Query parameter "type" is required');
    }

    const results = await svc.search(query);
    return sendSuccess(reply, results, 200, {
      page: results.page,
      totalPages: results.totalPages,
      total: results.total,
    } as any);
  });
};

export default advancedSearchRoutes;
