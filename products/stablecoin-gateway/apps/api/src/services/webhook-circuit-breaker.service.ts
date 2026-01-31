/**
 * Webhook Circuit Breaker Service
 *
 * Tracks consecutive failures per endpoint in Redis. After threshold
 * failures the circuit opens, pausing deliveries for a cooldown period.
 * Uses Lua script for atomic increment + open in a single round-trip.
 */

import { logger } from '../utils/logger.js';

/**
 * Minimal Redis interface required by the circuit breaker.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string>;
  incr(key: string): Promise<number>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any>;
}

export class WebhookCircuitBreakerService {
  private readonly CIRCUIT_THRESHOLD = 10;
  private readonly CIRCUIT_RESET_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Lua script that atomically increments the failure counter,
   * refreshes its TTL, and opens the circuit when the threshold
   * is reached.
   */
  private static readonly CIRCUIT_BREAKER_SCRIPT = `
    local failures = redis.call('INCR', KEYS[1])
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    if failures >= tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], ARGV[3], 'PX', ARGV[4])
    end
    return failures
  `;

  constructor(private redis: RedisLike | null) {}

  /**
   * Check whether the circuit for a given endpoint is open.
   */
  async isCircuitOpen(endpointId: string): Promise<boolean> {
    if (!this.redis) return false;

    const openedAt = await this.redis.get('circuit:open:' + endpointId);
    if (!openedAt) return false;

    if (Date.now() - parseInt(openedAt, 10) < this.CIRCUIT_RESET_MS) {
      return true;
    }

    // Cooldown elapsed -- reset the circuit
    await this.redis.del('circuit:open:' + endpointId);
    await this.redis.del('circuit:failures:' + endpointId);
    return false;
  }

  /**
   * Record a delivery failure. Uses Lua script for atomicity.
   */
  async recordFailure(endpointId: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.eval(
        WebhookCircuitBreakerService.CIRCUIT_BREAKER_SCRIPT,
        2,
        'circuit:failures:' + endpointId,
        'circuit:open:' + endpointId,
        600,
        this.CIRCUIT_THRESHOLD,
        String(Date.now()),
        this.CIRCUIT_RESET_MS,
      );
    } catch {
      // Fallback: non-atomic approach
      const failures = await this.redis.incr('circuit:failures:' + endpointId);
      await this.redis.expire('circuit:failures:' + endpointId, 600);
      if (failures >= this.CIRCUIT_THRESHOLD) {
        await this.redis.set(
          'circuit:open:' + endpointId,
          String(Date.now()),
          'PX',
          this.CIRCUIT_RESET_MS,
        );
      }
    }
  }

  /**
   * Record a successful delivery, resetting the circuit breaker.
   */
  async recordSuccess(endpointId: string): Promise<void> {
    if (!this.redis) return;

    await this.redis.del('circuit:failures:' + endpointId);
    await this.redis.del('circuit:open:' + endpointId);
  }
}
