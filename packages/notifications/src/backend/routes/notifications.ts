/**
 * In-App Notification Routes
 *
 * CRUD endpoints for in-app notifications with read tracking.
 * All endpoints require authentication.
 */

import { FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { NotificationService } from '../services/notification.service.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread_only: z.coerce.boolean().default(false),
});

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new NotificationService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /notifications
  fastify.get('/', async (request, reply) => {
    const { page, limit, unread_only } = listSchema.parse(request.query);
    const result = await service.list(request.currentUser!.id, { page, limit, unreadOnly: unread_only });
    return reply.send(result);
  });

  // GET /notifications/unread-count
  fastify.get('/unread-count', async (request, reply) => {
    const count = await service.getUnreadCount(request.currentUser!.id);
    return reply.send({ count });
  });

  // PATCH /notifications/:id/read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const notification = await service.markAsRead(id, request.currentUser!.id);
    if (!notification) return reply.code(404).send({ status: 404, detail: 'Notification not found' });
    return reply.send({ notification });
  });

  // POST /notifications/read-all
  fastify.post('/read-all', async (request, reply) => {
    const count = await service.markAllAsRead(request.currentUser!.id);
    return reply.send({ message: `${count} notifications marked as read` });
  });

  // DELETE /notifications/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await service.delete(id, request.currentUser!.id);
    if (!deleted) return reply.code(404).send({ status: 404, detail: 'Notification not found' });
    return reply.code(204).send();
  });
};

export default notificationRoutes;
