import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis?: Redis;
  }
}

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    fastify.log.warn('REDIS_URL not set -- Redis disabled');
    return;
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    fastify.decorate('redis', redis);
    fastify.addHook('onClose', async () => {
      await redis.quit();
    });
  } catch (_err) {
    fastify.log.warn('Redis connection failed -- running without cache');
  }
});

export default redisPlugin;
