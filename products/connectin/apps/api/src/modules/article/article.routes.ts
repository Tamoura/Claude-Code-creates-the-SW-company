import { FastifyPluginAsync } from 'fastify';
import { ArticleService } from './article.service';
import { sendSuccess } from '../../lib/response';

const articleRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ArticleService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET / — list published articles
  fastify.get<{
    Querystring: { limit?: string; offset?: string };
  }>('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const limit = Math.min(50, parseInt(request.query.limit ?? '20', 10) || 20);
    const offset = parseInt(request.query.offset ?? '0', 10) || 0;
    const data = await service.listPublishedArticles(limit, offset);
    return sendSuccess(reply, data);
  });

  // POST / — create article
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          coverImageUrl: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const data = await service.createArticle(
      request.user.sub,
      request.body as any
    );
    return sendSuccess(reply, data, 201);
  });

  // GET /user/:userId — list user's articles
  fastify.get<{ Params: { userId: string } }>('/user/:userId', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.listUserArticles(
      request.params.userId,
      request.user.sub
    );
    return sendSuccess(reply, data);
  });

  // GET /:id — get article by id
  fastify.get<{ Params: { id: string } }>('/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.getArticle(request.params.id);
    return sendSuccess(reply, data);
  });

  // PATCH /:id — update article
  fastify.patch<{ Params: { id: string } }>('/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          status: { type: 'string' },
          coverImageUrl: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const data = await service.updateArticle(
      request.params.id,
      request.user.sub,
      request.body as any
    );
    return sendSuccess(reply, data);
  });

  // DELETE /:id — delete article
  fastify.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const data = await service.deleteArticle(
      request.params.id,
      request.user.sub
    );
    return sendSuccess(reply, data);
  });
};

export default articleRoutes;
