import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

const requestIdPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const correlationId =
      (request.headers['x-request-id'] as string) ||
      crypto.randomUUID();
    request.id = correlationId;
    reply.header('x-request-id', correlationId);
  });
};

export default fp(requestIdPlugin, { name: 'request-id' });
