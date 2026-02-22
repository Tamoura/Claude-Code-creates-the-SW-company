import { FastifyPluginAsync } from 'fastify';
import { ConnectionService } from './connection.service';
import { sendRequestSchema } from './connection.schemas';
import { sendSuccess } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const connectionRoutes: FastifyPluginAsync = async (
  fastify
) => {
  const connectionService = new ConnectionService(
    fastify.prisma
  );

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/connections/request
  fastify.post('/request', {
    schema: {
      description: 'Send a connection request to another user',
      tags: ['Connections'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['receiverId'],
        properties: {
          receiverId: { type: 'string', format: 'uuid' },
          message: { type: 'string', maxLength: 300 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                senderId: { type: 'string' },
                receiverId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = sendRequestSchema.safeParse(
      request.body
    );
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await connectionService.sendRequest(
      request.user.sub,
      result.data
    );
    return sendSuccess(reply, data, 201);
  });

  // PUT /api/v1/connections/:id/accept
  fastify.put<{ Params: { id: string } }>(
    '/:id/accept',
    {
      schema: {
        description: 'Accept an incoming connection request',
        tags: ['Connections'],
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
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await connectionService.acceptRequest(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // PUT /api/v1/connections/:id/reject
  fastify.put<{ Params: { id: string } }>(
    '/:id/reject',
    {
      schema: {
        description: 'Reject an incoming connection request',
        tags: ['Connections'],
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
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await connectionService.rejectRequest(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/connections
  fastify.get('/', {
    schema: {
      description: 'List all accepted connections for the current user',
      tags: ['Connections'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = await connectionService.listConnections(
      request.user.sub,
      request.query as { page?: string; limit?: string }
    );
    return sendSuccess(reply, result.data, 200, result.meta);
  });

  // GET /api/v1/connections/pending
  fastify.get('/pending', {
    schema: {
      description: 'List pending incoming and outgoing connection requests',
      tags: ['Connections'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = await connectionService.listPending(
      request.user.sub,
      request.query as { page?: string; limit?: string }
    );
    return sendSuccess(reply, data, 200, {
      incomingCount: data.incoming.length,
      outgoingCount: data.outgoing.length,
    } as any);
  });
};

export default connectionRoutes;
