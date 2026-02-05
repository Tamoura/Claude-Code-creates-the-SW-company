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
import { logger } from './logger.js';

export interface RateLimitStoreOptions {
  redis?: Redis;
  keyPrefix?: string;
}

/**
 * In-memory fallback entry for rate limiting when Redis is unavailable.
 * Entries expire after their TTL to prevent unbounded memory growth.
 */
interface MemoryEntry {
  count: number;
  expiresAt: number;
}

export class RedisRateLimitStore {
  private redis: Redis;
  private keyPrefix: string;
  /** In-memory fallback counters used when Redis is unavailable (RISK-056). */
  private memoryFallback: Map<string, MemoryEntry> = new Map();

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
   * Evict expired entries from the in-memory fallback to prevent leaks.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryFallback) {
      if (entry.expiresAt <= now) {
        this.memoryFallback.delete(key);
      }
    }
  }

  /**
   * Increment the request counter for a key
   *
   * Returns the current count and TTL.
   * Falls back to an in-memory Map when Redis is unavailable (RISK-056).
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
      // RISK-056: Fall back to in-memory rate limiting instead of
      // propagating the error (which bypasses rate limiting entirely).
      logger.warn('Redis unavailable for rate limiting, using in-memory fallback', {
        key: redisKey,
        error: error instanceof Error ? error.message : 'unknown',
      });

      this.evictExpired();

      const now = Date.now();
      const existing = this.memoryFallback.get(redisKey);
      if (existing && existing.expiresAt > now) {
        existing.count += 1;
        callback(null, { current: existing.count, ttl: existing.expiresAt - now });
      } else {
        this.memoryFallback.set(redisKey, { count: 1, expiresAt: now + ttl });
        callback(null, { current: 1, ttl });
      }
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
