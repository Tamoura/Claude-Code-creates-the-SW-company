import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { FeedService } from './feed.service';
import {
  createPostSchema,
  createCommentSchema,
} from './feed.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

function zodToDetails(
  err: ZodError
): Array<{ field: string; message: string }> {
  return err.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}

const feedRoutes: FastifyPluginAsync = async (fastify) => {
  const feedService = new FeedService(fastify.prisma);

  // All feed routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/feed/posts
  fastify.post('/posts', async (request, reply) => {
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
  fastify.get('/', async (request, reply) => {
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
