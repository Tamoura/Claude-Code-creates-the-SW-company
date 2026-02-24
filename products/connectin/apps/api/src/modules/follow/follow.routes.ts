import { FastifyPluginAsync } from 'fastify';
import { FollowService } from './follow.service';
import { followUserSchema } from './follow.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const followRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const followService = new FollowService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/follows — follow a user
  fastify.post('/', {
    schema: {
      description: 'Follow a user',
      tags: ['Follows'],
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
    const result = followUserSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await followService.followUser(
      request.user.sub,
      result.data.userId
    );
    return sendSuccess(reply, data, 201);
  });

  // DELETE /api/v1/follows/:userId — unfollow a user
  fastify.delete<{ Params: { userId: string } }>(
    '/:userId',
    {
      schema: {
        description: 'Unfollow a user',
        tags: ['Follows'],
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
      const data = await followService.unfollowUser(
        request.user.sub,
        request.params.userId
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/follows/followers — list followers
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/followers', {
    schema: {
      description: 'List followers of the current user',
      tags: ['Follows'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
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
    const limit = parseInt(
      (request.query as any).limit || '20',
      10
    );
    const offset = parseInt(
      (request.query as any).offset || '0',
      10
    );
    const data = await followService.getFollowers(
      request.user.sub,
      limit,
      offset
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/follows/following — list following
  fastify.get('/following', {
    schema: {
      description:
        'List users the current user follows',
      tags: ['Follows'],
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
    const data = await followService.getFollowing(
      request.user.sub
    );
    return sendSuccess(reply, data);
  });

  // GET /api/v1/follows/:userId/status — check follow status
  fastify.get<{ Params: { userId: string } }>(
    '/:userId/status',
    {
      schema: {
        description:
          'Check if current user follows a user',
        tags: ['Follows'],
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
      const data = await followService.getFollowStatus(
        request.user.sub,
        request.params.userId
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/follows/:userId/counts — get follow counts
  fastify.get<{ Params: { userId: string } }>(
    '/:userId/counts',
    {
      schema: {
        description:
          'Get follower and following counts for a user',
        tags: ['Follows'],
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
      const data = await followService.getFollowCounts(
        request.params.userId
      );
      return sendSuccess(reply, data);
    }
  );
};

export default followRoutes;
