/**
 * Redis Plugin
 *
 * Provides Redis client for distributed caching and rate limiting.
 *
 * Features:
 * - Automatic connection handling
 * - Graceful shutdown on app close
 * - Health monitoring
 * - Optional configuration (graceful degradation if Redis unavailable)
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection URL (optional)
 *   Format: redis://[user:password@]host:port[/db]
 *   Example: redis://localhost:6379
 *
 * If REDIS_URL is not set, Redis will be disabled and in-memory
 * alternatives will be used where possible.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured - Redis features disabled');
    logger.warn('Rate limiting will use in-memory store (not distributed)');
    fastify.decorate('redis', null);
    return;
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        logger.error('Redis connection error', err);
        return true; // Attempt reconnect
      },
    });

    // Handle connection events
    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('ready', () => {
      logger.info('Redis ready');
    });

    redis.on('error', (err) => {
      logger.error('Redis error', err);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });

    // Wait for connection to be ready (with timeout)
    try {
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        ),
      ]);
      logger.info('Redis connection established');
    } catch (err) {
      logger.error('Redis ping failed', err);
      await redis.quit();
      throw err;
    }

    // Decorate Fastify instance with Redis client
    fastify.decorate('redis', redis);

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      logger.info('Closing Redis connection');
      await redis.quit();
    });
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    logger.warn('Redis features disabled - using in-memory fallbacks');
    fastify.decorate('redis', null);
  }
};

export default fp(redisPlugin, {
  name: 'redis',
});
