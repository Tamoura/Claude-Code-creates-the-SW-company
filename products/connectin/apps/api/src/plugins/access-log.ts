import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const accessLogPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;
    const userId = (request.user as any)?.sub || 'anonymous';
    fastify.log.info({
      msg: 'access',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: Math.round(duration),
      userId,
      requestId: request.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });
};

export default fp(accessLogPlugin, { name: 'access-log' });
