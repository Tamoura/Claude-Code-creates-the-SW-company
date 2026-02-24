import { FastifyPluginAsync } from 'fastify';
import { HashtagService } from './hashtag.service';
import { sendSuccess } from '../../lib/response';

const hashtagRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const hashtagService = new HashtagService(
    fastify.prisma
  );

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/hashtags/trending
  fastify.get<{
    Querystring: { limit?: string };
  }>('/trending', {
    schema: {
      description: 'Get trending hashtags',
      tags: ['Hashtags'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
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
      request.query.limit || '20',
      10
    );
    const data = await hashtagService.getTrending(limit);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/hashtags/:tag/posts
  fastify.get<{
    Params: { tag: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:tag/posts', {
    schema: {
      description: 'Get posts by hashtag',
      tags: ['Hashtags'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['tag'],
        properties: {
          tag: { type: 'string' },
        },
      },
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
      request.query.limit || '20',
      10
    );
    const offset = parseInt(
      request.query.offset || '0',
      10
    );
    const data = await hashtagService.getPostsByTag(
      request.params.tag,
      limit,
      offset
    );
    return sendSuccess(reply, data);
  });

  // POST /api/v1/hashtags/:tag/follow
  fastify.post<{
    Params: { tag: string };
  }>('/:tag/follow', {
    schema: {
      description: 'Follow a hashtag',
      tags: ['Hashtags'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['tag'],
        properties: {
          tag: { type: 'string' },
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
    const data = await hashtagService.followHashtag(
      request.params.tag,
      request.user.sub
    );
    return sendSuccess(reply, data, 201);
  });

  // DELETE /api/v1/hashtags/:tag/follow
  fastify.delete<{
    Params: { tag: string };
  }>('/:tag/follow', {
    schema: {
      description: 'Unfollow a hashtag',
      tags: ['Hashtags'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['tag'],
        properties: {
          tag: { type: 'string' },
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
  }, async (request, reply) => {
    const data = await hashtagService.unfollowHashtag(
      request.params.tag,
      request.user.sub
    );
    return sendSuccess(reply, data);
  });
};

export default hashtagRoutes;
