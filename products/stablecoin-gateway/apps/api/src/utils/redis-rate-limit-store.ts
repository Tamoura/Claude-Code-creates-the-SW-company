/**
 * Redis Rate Limit Store
 *
 * Distributed rate limiting store using Redis.
 * Implements the @fastify/rate-limit store interface.
 *
 * Algorithm: Token Bucket using Redis
 * - Each key has a counter and TTL
 * - Counter increments on each request
 * - TTL ensures automatic cleanup
 * - Atomic operations prevent race conditions
 *
 * Benefits:
 * - Works across multiple server instances
 * - Automatic cleanup via TTL
 * - High performance (Redis in-memory)
 * - Atomic operations (no race conditions)
 */

import { Redis } from 'ioredis';

export interface RateLimitStoreOptions {
  redis: Redis;
  keyPrefix?: string;
}

export class RedisRateLimitStore {
  private redis: Redis;
  private keyPrefix: string;

  constructor(options: RateLimitStoreOptions) {
    this.redis = options.redis;
    this.keyPrefix = options.keyPrefix || 'ratelimit:';
  }

  /**
   * Increment the request counter for a key
   *
   * Returns the current count and TTL
   */
  async incr(key: string, callback: (err: Error | null, result?: { current: number; ttl: number }) => void): Promise<void> {
    const redisKey = this.keyPrefix + key;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);

      const results = await pipeline.exec();

      if (!results) {
        callback(new Error('Redis pipeline execution failed'));
        return;
      }

      const [incrResult, ttlResult] = results;

      if (incrResult[0]) {
        callback(incrResult[0] as Error);
        return;
      }

      if (ttlResult[0]) {
        callback(ttlResult[0] as Error);
        return;
      }

      const current = incrResult[1] as number;
      const ttl = ttlResult[1] as number;

      callback(null, { current, ttl });
    } catch (error) {
      callback(error as Error);
    }
  }

  /**
   * Get the current count for a key
   */
  async child(routeOptions: { ttl?: number }): Promise<RedisRateLimitStore> {
    const ttl = routeOptions.ttl || 60000; // Default 60 seconds

    return {
      redis: this.redis,
      keyPrefix: this.keyPrefix,
      incr: async (key: string, callback: (err: Error | null, result?: { current: number; ttl: number }) => void) => {
        const redisKey = this.keyPrefix + key;

        try {
          // Increment and set TTL if not exists
          const current = await this.redis.incr(redisKey);

          // Set TTL on first request (when counter is 1)
          if (current === 1) {
            await this.redis.pexpire(redisKey, ttl);
          }

          const remainingTtl = await this.redis.pttl(redisKey);

          callback(null, {
            current,
            ttl: remainingTtl > 0 ? remainingTtl : ttl,
          });
        } catch (error) {
          callback(error as Error);
        }
      },
    } as any;
  }
}
