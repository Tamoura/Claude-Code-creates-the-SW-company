import { FastifyPluginAsync } from 'fastify';
import { NotFoundError, ConflictError } from '../utils/errors';
import { parsePagination, paginatedResult } from '../utils/pagination';

const resourceRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /resources - List resources
  fastify.get<{
    Querystring: {
      type?: string;
      domain?: string;
      level?: string;
      featured?: string;
      page?: string;
      limit?: string;
    };
  }>('/resources', async (request, reply) => {
    const { type, domain, level, featured, page, limit } = request.query;
    const pagination = parsePagination({ page, limit });

    const where: any = { active: true };
    if (type) where.type = type;
    if (domain) where.domain = domain;
    if (level) where.level = level;
    if (featured !== undefined) where.featured = featured === 'true';

    const [resources, total] = await Promise.all([
      fastify.prisma.resource.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
      fastify.prisma.resource.count({ where }),
    ]);

    // nosemgrep: javascript.express.security.audit.xss.direct-response-write
    return reply.send(paginatedResult(resources, total, pagination));
  });

  // GET /resources/:id - Get resource details
  fastify.get<{ Params: { id: string } }>('/resources/:id', async (request, reply) => {
    const { id } = request.params;

    const resource = await fastify.prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundError('Resource not found');
    }

    return reply.send({ resource });
  });

  // POST /resources/:id/bookmark - Bookmark resource
  fastify.post<{ Params: { id: string } }>('/resources/:id/bookmark', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      // Check if resource exists
      const resource = await fastify.prisma.resource.findUnique({
        where: { id },
      });

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      // Check if already bookmarked
      const existing = await fastify.prisma.bookmark.findUnique({
        where: {
          userId_resourceId: {
            userId: request.currentUser!.id,
            resourceId: id,
          },
        },
      });

      if (existing) {
        throw new ConflictError('Resource already bookmarked');
      }

      // Create bookmark
      const bookmark = await fastify.prisma.bookmark.create({
        data: {
          userId: request.currentUser!.id,
          resourceId: id,
        },
      });

      return reply.code(201).send({ bookmark });
    },
  });

  // DELETE /resources/:id/bookmark - Remove bookmark
  fastify.delete<{ Params: { id: string } }>('/resources/:id/bookmark', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const bookmark = await fastify.prisma.bookmark.findUnique({
        where: {
          userId_resourceId: {
            userId: request.currentUser!.id,
            resourceId: id,
          },
        },
      });

      if (!bookmark) {
        throw new NotFoundError('Bookmark not found');
      }

      await fastify.prisma.bookmark.delete({
        where: { id: bookmark.id },
      });

      return reply.send({ message: 'Bookmark removed' });
    },
  });

  // GET /resources/bookmarks - List user's bookmarks
  fastify.get('/resources/bookmarks', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const bookmarks = await fastify.prisma.bookmark.findMany({
        where: { userId: request.currentUser!.id },
        include: { resource: true },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ bookmarks });
    },
  });
};

export default resourceRoutes;
