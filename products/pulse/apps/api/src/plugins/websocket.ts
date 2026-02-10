/**
 * WebSocket Plugin
 * New plugin for Pulse real-time activity feed.
 *
 * Uses @fastify/websocket to set up WebSocket support.
 * Room-based subscription and broadcasting are handled
 * in the activity module's ws-handler.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { logger } from '../utils/logger.js';

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  logger.info('WebSocket plugin registered');
};

export default fp(websocketPlugin, {
  name: 'websocket',
});
