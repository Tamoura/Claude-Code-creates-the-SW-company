import { FastifyPluginAsync } from 'fastify';
import { BlockService } from './block.service';
import {
  blockUserSchema,
  createReportSchema,
} from './block.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

export const blockRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const blockService = new BlockService(fastify.prisma);

  // All block routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/blocks — block a user
  fastify.post('/', {
    schema: {
      description: 'Block a user',
      tags: ['Blocks'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = blockUserSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await blockService.blockUser(
      request.user.sub,
      result.data.userId
    );
    return sendSuccess(reply, data, 201);
  });

  // DELETE /api/v1/blocks/:userId — unblock a user
  fastify.delete<{ Params: { userId: string } }>(
    '/:userId',
    {
      schema: {
        description: 'Unblock a user',
        tags: ['Blocks'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
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
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await blockService.unblockUser(
        request.user.sub,
        request.params.userId
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/blocks — list blocked users
  fastify.get('/', {
    schema: {
      description: 'List blocked users',
      tags: ['Blocks'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await blockService.getBlockedUsers(
      request.user.sub
    );
    return sendSuccess(reply, data);
  });
};

export const reportRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const blockService = new BlockService(fastify.prisma);

  // All report routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/reports — create a report
  fastify.post('/', {
    schema: {
      description: 'Report a user, post, or comment',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['targetType', 'targetId', 'reason'],
        properties: {
          targetType: {
            type: 'string',
            enum: ['USER', 'POST', 'COMMENT'],
          },
          targetId: { type: 'string', format: 'uuid' },
          reason: {
            type: 'string',
            enum: [
              'SPAM',
              'HARASSMENT',
              'HATE_SPEECH',
              'MISINFORMATION',
              'IMPERSONATION',
              'OTHER',
            ],
          },
          description: {
            type: 'string',
            maxLength: 1000,
          },
        },
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = createReportSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await blockService.createReport(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, data, 201);
  });
};

export default { blockRoutes, reportRoutes };
