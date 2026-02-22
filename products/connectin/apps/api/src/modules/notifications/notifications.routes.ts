import { FastifyPluginAsync } from 'fastify';
import { NotificationsService } from './notifications.service';
import { sendSuccess } from '../../lib/response';

const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new NotificationsService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/notifications — list notifications
  fastify.get('/', {
    schema: {
      description: 'List notifications for the current user',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'string' },
          unreadOnly: { type: 'string', enum: ['true', 'false'] },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await svc.listNotifications(
      request.user.sub,
      request.query as { cursor?: string; limit?: string; unreadOnly?: string }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // GET /api/v1/notifications/unread-count
  fastify.get('/unread-count', {
    schema: {
      description: 'Get unread notification count',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await svc.getUnreadCount(request.user.sub);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/notifications/read-all — must be before /:id/read to avoid conflict
  fastify.patch('/read-all', {
    schema: {
      description: 'Mark all notifications as read',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await svc.markAllRead(request.user.sub);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/notifications/:id/read
  fastify.patch<{ Params: { id: string } }>('/:id/read', {
    schema: {
      description: 'Mark a notification as read',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await svc.markRead(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/notifications/preferences
  fastify.get('/preferences', {
    schema: {
      description: 'Get notification preferences',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.getOrCreatePreferences(request.user.sub);
    return sendSuccess(reply, data);
  });

  // PUT /api/v1/notifications/preferences
  fastify.put('/preferences', {
    schema: {
      description: 'Update notification preferences',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          connectionRequests: { type: 'boolean' },
          messages: { type: 'boolean' },
          postLikes: { type: 'boolean' },
          postComments: { type: 'boolean' },
          jobRecommendations: { type: 'boolean' },
          emailDigest: { type: 'string', enum: ['OFF', 'DAILY', 'WEEKLY'] },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await svc.updatePreferences(request.user.sub, request.body as any);
    return sendSuccess(reply, data);
  });
};

export default notificationsRoutes;
