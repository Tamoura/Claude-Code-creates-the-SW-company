import { FastifyPluginAsync } from 'fastify';
import { SearchService, SearchType } from './search.service';
import { sendSuccess, sendError } from '../../lib/response';

const VALID_TYPES = ['people', 'posts', 'jobs'];

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const searchService = new SearchService(fastify.prisma);

  // GET /api/v1/search?q=&type=
  fastify.get<{
    Querystring: { q?: string; type?: string };
  }>(
    '/',
    {
      schema: {
        description: 'Search for people, posts, and jobs',
        tags: ['Search'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: VALID_TYPES },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  query: { type: 'string' },
                  people: { type: 'array', items: { type: 'object', additionalProperties: true } },
                  posts: { type: 'array', items: { type: 'object', additionalProperties: true } },
                  jobs: { type: 'array', items: { type: 'object', additionalProperties: true } },
                },
              },
            },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const q = request.query.q?.trim();
      const type = request.query.type;

      if (!q) {
        return sendError(reply, 400, 'BAD_REQUEST', 'Query parameter "q" is required');
      }

      if (type && !VALID_TYPES.includes(type)) {
        return sendError(
          reply,
          400,
          'BAD_REQUEST',
          `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        );
      }

      const results = await searchService.search(
        q,
        type as SearchType | undefined
      );

      return sendSuccess(reply, results);
    }
  );
};

export default searchRoutes;
