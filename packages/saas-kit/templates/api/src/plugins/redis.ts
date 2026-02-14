import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:{{redisPort}}', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();
  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});
