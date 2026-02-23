import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { connectionManager } from '../ws/connection-manager';
import { UnauthorizedError } from '../lib/errors';

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    // JWT auth from query param
    const url = new URL(
      request.url || '',
      `http://${request.headers.host}`
    );
    const token = url.searchParams.get('token');

    if (!token) {
      socket.send(
        JSON.stringify({ type: 'error', payload: { message: 'No token' } })
      );
      socket.close(4001, 'Unauthorized');
      return;
    }

    let decoded: { sub: string; role: string };
    try {
      decoded = fastify.jwt.verify<{ sub: string; role: string }>(token);
    } catch {
      socket.send(
        JSON.stringify({ type: 'error', payload: { message: 'Invalid token' } })
      );
      socket.close(4001, 'Unauthorized');
      return;
    }

    const userId = decoded.sub;
    connectionManager.add(userId, socket);

    // Broadcast presence
    connectionManager.broadcastToConversation(
      connectionManager.getOnlineUserIds(),
      userId,
      { type: 'presence:online', payload: { userId } }
    );

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', payload: {} }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on('close', () => {
      connectionManager.remove(userId, socket);

      if (!connectionManager.isOnline(userId)) {
        // Broadcast offline to all connected users
        connectionManager.broadcastToConversation(
          connectionManager.getOnlineUserIds(),
          userId,
          { type: 'presence:offline', payload: { userId } }
        );
      }
    });
  });

  // Non-websocket GET /ws handler for token validation (used by inject tests)
  fastify.addHook('preHandler', async (request, _reply) => {
    if (
      request.url?.startsWith('/ws') &&
      request.method === 'GET' &&
      !request.headers.upgrade
    ) {
      const url = new URL(
        request.url || '',
        `http://${request.headers.host}`
      );
      const token = url.searchParams.get('token');
      if (!token) {
        throw new UnauthorizedError('Token required');
      }
      try {
        fastify.jwt.verify(token);
      } catch {
        throw new UnauthorizedError('Invalid token');
      }
    }
  });
};

export default fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['auth'],
});
