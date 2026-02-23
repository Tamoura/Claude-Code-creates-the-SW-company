import { FastifyPluginAsync } from 'fastify';
import { connectionManager } from '../../ws/connection-manager';
import { sendSuccess } from '../../lib/response';

const presenceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/presence/online — list online user IDs
  fastify.get('/online', {
    schema: {
      description: 'Get list of currently online user IDs',
      tags: ['Presence'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const onlineIds = connectionManager.getOnlineUserIds();
    return sendSuccess(reply, onlineIds);
  });
};

export default presenceRoutes;
