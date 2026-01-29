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
  redis?: Redis;
  keyPrefix?: string;
}

export class RedisRateLimitStore {
  private redis: Redis;
  private keyPrefix: string;

  constructor(options: RateLimitStoreOptions = {}) {
    // When @fastify/rate-limit instantiates this, it passes globalParams
    // We need to get the redis instance from somewhere else
    // This will be set via a static property
    this.redis = options.redis || (RedisRateLimitStore as any)._redis;
    this.keyPrefix = options.keyPrefix || 'ratelimit:';
  }

  static setRedis(redis: Redis): void {
    (RedisRateLimitStore as any)._redis = redis;
  }

  /**
   * Increment the request counter for a key
   *
   * Returns the current count and TTL
   */
  async incr(key: string, callback: (err: Error | null, result?: { current: number; ttl: number }) => void): Promise<void> {
    const redisKey = this.keyPrefix + key;
    const ttl = (this as any)._routeTtl || 60000; // Use route-specific TTL or default

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
  }

  /**
   * Create a child store for route-specific rate limiting
   */
  child(routeOptions: { ttl?: number; timeWindow?: number; keyPrefix?: string }): RedisRateLimitStore {
    // Create a new instance with the same Redis connection but route-specific options
    const childStore = new RedisRateLimitStore({
      redis: this.redis,
      keyPrefix: routeOptions.keyPrefix || this.keyPrefix,
    });

    // Store the TTL for this child (used in incr method)
    (childStore as any)._routeTtl = routeOptions.ttl || routeOptions.timeWindow || 60000;

    return childStore;
  }
}
