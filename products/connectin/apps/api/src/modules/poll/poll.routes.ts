import { FastifyPluginAsync } from 'fastify';
import { PollService } from './poll.service';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

const pollRoutes: FastifyPluginAsync = async (fastify) => {
  const pollService = new PollService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/polls/:pollId/vote
  fastify.post<{ Params: { pollId: string } }>(
    '/:pollId/vote',
    {
      schema: {
        description: 'Vote on a poll',
        tags: ['Polls'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['pollId'],
          properties: {
            pollId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['optionId'],
          properties: {
            optionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { optionId } = request.body as { optionId: string };
      if (!optionId) {
        throw new ValidationError('optionId is required');
      }
      const data = await pollService.vote(
        request.params.pollId,
        optionId,
        request.user.sub
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // GET /api/v1/polls/:pollId
  fastify.get<{ Params: { pollId: string } }>(
    '/:pollId',
    {
      schema: {
        description: 'Get poll results',
        tags: ['Polls'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['pollId'],
          properties: {
            pollId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await pollService.getPollResults(
        request.params.pollId,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );
};

export default pollRoutes;
