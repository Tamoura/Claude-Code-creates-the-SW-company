/**
 * plugins/redis.ts — Redis connection plugin
 *
 * Registration order: after prismaPlugin, before authPlugin.
 *
 * Features:
 * - Optional configuration — degrades gracefully if REDIS_URL not set
 * - TLS support for production Redis
 * - Retry strategy with exponential backoff
 * - Graceful shutdown
 *
 * PATTERN-022 applied: Redis graceful fallback — rate limiting uses
 * in-memory store when Redis is unavailable.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured — Redis features disabled');
    fastify.decorate('redis', null);
    return;
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err: Error) {
        logger.error('Redis connection error', err);
        return true;
      },
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('ready', () => logger.info('Redis ready'));
    redis.on('error', (err) => logger.error('Redis error', err));
    redis.on('close', () => logger.warn('Redis connection closed'));
    redis.on('reconnecting', () => logger.info('Redis reconnecting'));

    // Verify connection with ping and 5-second timeout
    await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout after 5s')), 5000)
      ),
    ]);

    logger.info('Redis connection established');
    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
      logger.info('Closing Redis connection');
      await redis.quit();
    });
  } catch (error) {
    logger.error('Failed to connect to Redis — using in-memory fallbacks', error);
    fastify.decorate('redis', null);
  }
};

export default fp(redisPlugin, {
  name: 'redis',
});
