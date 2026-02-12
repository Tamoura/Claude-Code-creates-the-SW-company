import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not set, Redis features will be disabled');
    fastify.decorate('redis', null);
    return;
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis connection failed, operating without cache', err);
    fastify.decorate('redis', null);
    return;
  }

  redis.on('error', (err) => {
    logger.error('Redis error', err);
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    logger.info('Disconnecting from Redis');
    await redis.quit();
  });
}, { name: 'redis' });
