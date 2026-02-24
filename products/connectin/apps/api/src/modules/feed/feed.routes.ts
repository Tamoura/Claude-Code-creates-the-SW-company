import { FastifyPluginAsync } from 'fastify';
import { FeedService } from './feed.service';
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  reactToPostSchema,
} from './feed.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const feedRoutes: FastifyPluginAsync = async (fastify) => {
  const feedService = new FeedService(fastify.prisma);

  // All feed routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/feed/posts
  fastify.post('/posts', {
    schema: {
      description: 'Create a new feed post',
      tags: ['Feed'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 3000 },
          mediaUrl: { type: 'string', format: 'uri' },
          mediaIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            maxItems: 4,
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
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                authorId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = createPostSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await feedService.createPost(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/feed
  fastify.get('/', {
    schema: {
      description: 'Retrieve the paginated activity feed for the current user',
      tags: ['Feed'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
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
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = await feedService.getFeed(
      request.user.sub,
      request.query as {
        cursor?: string;
        limit?: string;
      }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // POST /api/v1/feed/posts/:id/like
  fastify.post<{ Params: { id: string } }>(
    '/posts/:id/like',
    {
      schema: {
        description: 'Like a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = await feedService.likePost(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // DELETE /api/v1/feed/posts/:id/like
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id/like',
    {
      schema: {
        description: 'Unlike a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = await feedService.unlikePost(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // PUT /api/v1/feed/posts/:id
  fastify.put<{ Params: { id: string } }>(
    '/posts/:id',
    {
      schema: {
        description: 'Edit a post (owner only)',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 3000 },
            textDirection: { type: 'string', enum: ['RTL', 'LTR', 'AUTO'] },
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
      const result = updatePostSchema.safeParse(
        request.body
      );
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await feedService.editPost(
        request.params.id,
        request.user.sub,
        result.data
      );
      return sendSuccess(reply, data);
    }
  );

  // DELETE /api/v1/feed/posts/:id
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id',
    {
      schema: {
        description: 'Delete a post (soft-delete, owner only)',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
      const data = await feedService.deletePost(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/feed/posts/:id/comments
  fastify.get<{ Params: { id: string } }>(
    '/posts/:id/comments',
    {
      schema: {
        description: 'Get comments for a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await feedService.getComments(
        request.params.id
      );
      return sendSuccess(reply, data);
    }
  );

  // POST /api/v1/feed/posts/:id/comment
  fastify.post<{ Params: { id: string } }>(
    '/posts/:id/comment',
    {
      schema: {
        description: 'Add a comment to a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 1000 },
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
      const result = createCommentSchema.safeParse(
        request.body
      );
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await feedService.addComment(
        request.params.id,
        request.user.sub,
        result.data
      );
      return sendSuccess(reply, data, 201);
    }
  );
  // POST /api/v1/feed/posts/:id/repost
  fastify.post<{ Params: { id: string } }>(
    '/posts/:id/repost',
    {
      schema: {
        description: 'Repost a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            comment: { type: 'string', maxLength: 1000 },
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
      const body = request.body as { comment?: string } | undefined;
      const data = await feedService.repostPost(
        request.params.id,
        request.user.sub,
        body?.comment
      );
      return sendSuccess(reply, data, 201);
    }
  );

  // DELETE /api/v1/feed/posts/:id/repost
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id/repost',
    {
      schema: {
        description: 'Remove a repost',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
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
      const data = await feedService.removeRepost(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // POST /api/v1/feed/posts/:id/react
  fastify.post<{ Params: { id: string } }>(
    '/posts/:id/react',
    {
      schema: {
        description: 'React to a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: [
                'LIKE',
                'CELEBRATE',
                'SUPPORT',
                'LOVE',
                'INSIGHTFUL',
                'FUNNY',
              ],
            },
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
      const result = reactToPostSchema.safeParse(
        request.body
      );
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await feedService.reactToPost(
        request.params.id,
        request.user.sub,
        result.data.type as import('@prisma/client').ReactionType
      );
      return sendSuccess(reply, data);
    }
  );

  // DELETE /api/v1/feed/posts/:id/react
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id/react',
    {
      schema: {
        description: 'Remove reaction from a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
      const data = await feedService.unreactToPost(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/feed/posts/:id/reactions
  fastify.get<{ Params: { id: string } }>(
    '/posts/:id/reactions',
    {
      schema: {
        description: 'Get reaction breakdown for a post',
        tags: ['Feed'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
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
      const data = await feedService.getPostReactions(
        request.params.id
      );
      return sendSuccess(reply, data);
    }
  );
};

export default feedRoutes;
