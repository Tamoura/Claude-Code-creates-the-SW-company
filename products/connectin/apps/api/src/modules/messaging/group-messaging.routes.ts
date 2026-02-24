import { FastifyPluginAsync } from 'fastify';
import { GroupMessagingService } from './group-messaging.service';
import { sendSuccess } from '../../lib/response';

const groupMessagingRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = new GroupMessagingService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/conversations/groups — create a group conversation
  fastify.post('/', {
    schema: {
      description: 'Create a group conversation',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'memberIds'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          memberIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 2,
          },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.createGroup(request.user.sub, request.body as any);
    return sendSuccess(reply, data, 201);
  });

  // POST /api/v1/conversations/groups/:id/members — add a member
  fastify.post<{ Params: { id: string } }>('/:id/members', {
    schema: {
      description: 'Add a member to a group',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const { userId } = request.body as { userId: string };
    const data = await svc.addMember(request.params.id, request.user.sub, userId);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/conversations/groups/:id/members/:userId — remove a member
  fastify.delete<{ Params: { id: string; userId: string } }>('/:id/members/:userId', {
    schema: {
      description: 'Remove a member from a group',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'userId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.removeMember(request.params.id, request.user.sub, request.params.userId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/conversations/groups/:id/leave — leave a group
  fastify.post<{ Params: { id: string } }>('/:id/leave', {
    schema: {
      description: 'Leave a group conversation',
      tags: ['Messaging'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
  }, async (request, reply) => {
    const data = await svc.leaveGroup(request.params.id, request.user.sub);
    return sendSuccess(reply, data);
  });
};

export default groupMessagingRoutes;
