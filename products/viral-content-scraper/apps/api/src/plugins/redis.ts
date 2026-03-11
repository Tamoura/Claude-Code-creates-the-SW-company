import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

async function redisPlugin(fastify: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not set — caching disabled');
    fastify.decorate('redis', null);
    return;
  }

  const redis = new Redis(redisUrl, {
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  fastify.decorate('redis', redis);
  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
}

export default fp(redisPlugin, { name: 'redis' });
