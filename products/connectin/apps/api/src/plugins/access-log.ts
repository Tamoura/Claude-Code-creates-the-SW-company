import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';

const accessLogPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === 'production' && !process.env.LOG_SALT) {
    throw new Error(
      'LOG_SALT environment variable is required in production'
    );
  }

  const LOG_SALT = process.env.LOG_SALT ?? 'connectin-log-salt';

  const hashIp = (ip: string): string =>
    createHash('sha256')
      .update(ip + LOG_SALT)
      .digest('hex')
      .slice(0, 16);
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
      ip: process.env.NODE_ENV === 'production'
        ? hashIp(request.ip)
        : request.ip,
    });
  });
};

export default fp(accessLogPlugin, { name: 'access-log' });
