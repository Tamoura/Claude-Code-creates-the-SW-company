import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured - Redis features disabled');
    fastify.decorate('redis', null);
    return;
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        return Math.min(times * 50, 2000);
      },
    });

    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      ),
    ]);
    logger.info('Redis connection established');

    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
      await redis.quit();
    });
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    fastify.decorate('redis', null);
  }
};

export default fp(redisPlugin, {
  name: 'redis',
});
