import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as crypto from 'crypto';

const requestIdPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    // Use existing X-Request-ID header or generate one
    if (!request.id) {
      const id = (request.headers['x-request-id'] as string) || crypto.randomUUID();
      Object.defineProperty(request, 'id', { value: id });
    }
  });

  fastify.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
};

export default fp(requestIdPlugin, {
  name: 'request-id',
});
