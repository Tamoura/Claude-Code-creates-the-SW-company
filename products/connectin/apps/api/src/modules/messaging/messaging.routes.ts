import { FastifyPluginAsync } from 'fastify';
import { MessagingService } from './messaging.service';
import { sendSuccess } from '../../lib/response';

const messagingRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new MessagingService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/conversations — get or create conversation with another user
  fastify.post('/', {
    schema: {
      description: 'Get or create a 1:1 conversation',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['otherUserId'],
        properties: {
          otherUserId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: { type: 'object', additionalProperties: true },
        201: { type: 'object', additionalProperties: true },
      },
    },
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { otherUserId } = request.body as { otherUserId: string };
    const data = await svc.getOrCreateConversation(request.user.sub, otherUserId);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/conversations — list user's conversations
  fastify.get('/', {
    schema: {
      description: 'List conversations for the current user',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await svc.listConversations(
      request.user.sub,
      request.query as { cursor?: string; limit?: string }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // GET /api/v1/conversations/:id/messages
  fastify.get<{ Params: { id: string } }>('/:id/messages', {
    schema: {
      description: 'Get messages for a conversation',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await svc.getMessages(
      request.params.id,
      request.user.sub,
      request.query as { cursor?: string; limit?: string }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // POST /api/v1/conversations/messages — send a message
  fastify.post('/messages', {
    schema: {
      description: 'Send a message in a conversation',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['conversationId', 'content'],
        properties: {
          conversationId: { type: 'string', format: 'uuid' },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
        },
      },
      response: {
        201: { type: 'object', additionalProperties: true },
      },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as { conversationId: string; content: string };
    const data = await svc.sendMessage(request.user.sub, body);
    return sendSuccess(reply, data, 201);
  });

  // PATCH /api/v1/conversations/messages/:id/read
  fastify.patch<{ Params: { id: string } }>('/messages/:id/read', {
    schema: {
      description: 'Mark a message as read',
      tags: ['Messaging'],
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
    const data = await svc.markMessageRead(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });
};

export default messagingRoutes;
