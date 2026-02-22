import { FastifyPluginAsync } from 'fastify';
import { FeedService } from './feed.service';
import {
  createPostSchema,
  createCommentSchema,
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
};

export default feedRoutes;
