/**
 * Redis Plugin
 *
 * Provides Redis client for distributed caching and rate limiting.
 *
 * Features:
 * - Automatic connection handling with retry strategy
 * - Graceful shutdown on app close
 * - Health monitoring via ping
 * - Graceful degradation if Redis unavailable (decorates with null)
 * - TLS support for secure connections
 * - Password authentication support
 *
 * Environment Variables:
 * - REDIS_URL: Connection URL (optional — if not set, Redis is disabled)
 * - REDIS_TLS: Enable TLS ('true' to enable)
 * - REDIS_TLS_REJECT_UNAUTHORIZED: Reject self-signed certs ('false' to allow)
 * - REDIS_PASSWORD: Password for auth (if not in URL)
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

export function getRedisOptions(): RedisOptions {
  const enableTls = process.env.REDIS_TLS === 'true';
  const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    tls: enableTls
      ? { rejectUnauthorized }
      : undefined,
    password,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      logger.error('Redis connection error', err);
      return true;
    },
  };
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
    const options = getRedisOptions();

    if (options.tls) {
      logger.info('Redis TLS enabled', { rejectUnauthorized: options.tls.rejectUnauthorized });
    }

    const redis = new Redis(redisUrl, options);

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('ready', () => logger.info('Redis ready'));
    redis.on('error', (err) => logger.error('Redis error', err));
    redis.on('close', () => logger.warn('Redis connection closed'));
    redis.on('reconnecting', () => logger.info('Redis reconnecting'));

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

    fastify.decorate('redis', redis);

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
