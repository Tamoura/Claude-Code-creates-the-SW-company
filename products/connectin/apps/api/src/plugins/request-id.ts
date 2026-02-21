import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidRequestId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 36 &&
    UUID_REGEX.test(value)
  );
}

const requestIdPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const headerValue = request.headers['x-request-id'];
    const correlationId = isValidRequestId(headerValue)
      ? headerValue
      : crypto.randomUUID();
    request.id = correlationId;
    reply.header('x-request-id', correlationId);
  });
};

export default fp(requestIdPlugin, { name: 'request-id' });
