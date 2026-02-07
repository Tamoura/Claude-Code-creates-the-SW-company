/**
 * Activity module routes.
 * - WebSocket: /api/v1/activity/stream
 * - REST: GET /api/v1/activity
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import {
  initActivityServices,
  handleWebSocketConnection,
  handleActivityFeed,
} from './handlers.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    verifyTeamMembership: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize shared services
  await initActivityServices(fastify);

  /**
   * WebSocket: /api/v1/activity/stream
   * Upgrade endpoint for real-time activity streaming.
   */
  fastify.get(
    '/stream',
    { websocket: true },
    (socket, request) => {
      handleWebSocketConnection(fastify, socket, request);
    }
  );

  /**
   * GET /api/v1/activity
   * Paginated activity feed (requires authentication).
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.verifyTeamMembership],
    },
    handleActivityFeed
  );
};

export default activityRoutes;
