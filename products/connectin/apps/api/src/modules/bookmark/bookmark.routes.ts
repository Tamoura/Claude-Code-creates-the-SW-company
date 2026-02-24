import { FastifyPluginAsync } from 'fastify';
import { BookmarkService } from './bookmark.service';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

const bookmarkRoutes: FastifyPluginAsync = async (fastify) => {
  const bookmarkService = new BookmarkService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/bookmarks
  fastify.post('/', {
    schema: {
      description: 'Bookmark a post or job',
      tags: ['Bookmarks'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          postId: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
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
  }, async (request, reply) => {
    const body = request.body as { postId?: string; jobId?: string };
    if (!body.postId && !body.jobId) {
      throw new ValidationError('Either postId or jobId is required');
    }

    const data = await bookmarkService.addBookmark(
      request.user.sub,
      body
    );

    const { isNew, ...bookmarkData } = data;
    return sendSuccess(reply, bookmarkData, isNew ? 201 : 200);
  });

  // GET /api/v1/bookmarks
  fastify.get('/', {
    schema: {
      description: 'List user bookmarks',
      tags: ['Bookmarks'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await bookmarkService.listBookmarks(
      request.user.sub
    );
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/bookmarks/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Remove a bookmark',
        tags: ['Bookmarks'],
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
      const data = await bookmarkService.removeBookmark(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );
};

export default bookmarkRoutes;
