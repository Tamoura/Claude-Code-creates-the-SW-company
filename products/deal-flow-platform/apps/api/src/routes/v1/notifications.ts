import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../types/index';
import { verifyToken } from '../../middleware/auth';

export default async function notificationRoutes(fastify: FastifyInstance) {

  // GET / -- list notifications (paginated)
  fastify.get('/', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;
    const query = request.query as Record<string, string>;
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const cursor = query.cursor;

    const total = await fastify.prisma.notification.count({
      where: { userId: user.id },
    });

    const unread = await fastify.prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    const cursorClause = cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {};

    const notifications = await fastify.prisma.notification.findMany({
      where: { userId: user.id },
      take: limit,
      ...cursorClause,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = notifications.length === limit
      ? notifications[notifications.length - 1].id
      : null;

    return reply.send({
      data: notifications,
      meta: { total, unread, limit, nextCursor },
    });
  });

  // PATCH /:id/read -- mark notification as read
  fastify.patch('/:id/read', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser!;

    const notification = await fastify.prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }

    const updated = await fastify.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return reply.send({ data: updated });
  });

  // PATCH /read-all -- mark all notifications as read
  fastify.patch('/read-all', {
    preHandler: [verifyToken],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser!;

    const result = await fastify.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return reply.send({
      data: { message: 'All notifications marked as read', count: result.count },
    });
  });
}
