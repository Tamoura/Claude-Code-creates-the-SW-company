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
 * - TLS support for secure connections
 * - Password authentication support
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection URL (optional)
 *   Format: redis://[user:password@]host:port[/db]
 *   Example: redis://localhost:6379
 * - REDIS_TLS: Enable TLS encryption ('true' to enable)
 * - REDIS_TLS_REJECT_UNAUTHORIZED: Reject self-signed certs ('false' to allow)
 * - REDIS_PASSWORD: Password for Redis authentication (if not in URL)
 *
 * If REDIS_URL is not set, Redis will be disabled and in-memory
 * alternatives will be used where possible.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger.js';

/**
 * Build Redis connection options based on environment variables.
 * Exported for testing purposes.
 */
export function getRedisOptions(): RedisOptions {
  const enableTls = process.env.REDIS_TLS === 'true';
  const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false';
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    // TLS configuration - enable for production/cloud Redis
    tls: enableTls
      ? {
          rejectUnauthorized,
        }
      : undefined,

    // Password authentication (if not already in REDIS_URL)
    password,

    // Retry configuration
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      logger.error('Redis connection error', err);
      return true; // Attempt reconnect
    },
  };
}

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
    const options = getRedisOptions();

    // Log TLS status for debugging
    if (options.tls) {
      logger.info('Redis TLS enabled', { rejectUnauthorized: options.tls.rejectUnauthorized });
    }

    const redis = new Redis(redisUrl, options);

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
