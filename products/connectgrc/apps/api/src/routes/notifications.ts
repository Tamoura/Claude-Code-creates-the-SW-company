import { FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../utils/errors';
import { parsePagination, paginatedResult } from '../utils/pagination';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /notifications - List user's notifications
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>('/notifications', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { page, limit } = request.query;
      const pagination = parsePagination({ page, limit });

      const [notifications, total] = await Promise.all([
        fastify.prisma.notification.findMany({
          where: { userId: request.currentUser!.id },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.notification.count({
          where: { userId: request.currentUser!.id },
        }),
      ]);

      // nosemgrep: javascript.express.security.audit.xss.direct-response-write
      return reply.send(paginatedResult(notifications, total, pagination));
    },
  });

  // PATCH /notifications/:id/read - Mark as read
  fastify.patch<{ Params: { id: string } }>('/notifications/:id/read', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;

      const notification = await fastify.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      if (notification.userId !== request.currentUser!.id) {
        throw new NotFoundError('Notification not found');
      }

      const updated = await fastify.prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      return reply.send({ notification: updated });
    },
  });

  // POST /notifications/read-all - Mark all as read
  fastify.post('/notifications/read-all', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      await fastify.prisma.notification.updateMany({
        where: {
          userId: request.currentUser!.id,
          read: false,
        },
        data: { read: true },
      });

      return reply.send({ message: 'All notifications marked as read' });
    },
  });

  // GET /notifications/unread-count - Get unread count
  fastify.get('/notifications/unread-count', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const count = await fastify.prisma.notification.count({
        where: {
          userId: request.currentUser!.id,
          read: false,
        },
      });

      return reply.send({ count });
    },
  });
};

export default notificationRoutes;
