/**
 * Webhook Circuit Breaker Service
 *
 * Tracks consecutive failures per endpoint in Redis. After threshold
 * failures the circuit opens, pausing deliveries for a cooldown period.
 * Uses Lua script for atomic increment + open in a single round-trip.
 */

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<string>;
  incr(key: string): Promise<number>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any>;
}

export interface CircuitBreakerOptions {
  /** Failures before opening circuit. Default: 10 */
  threshold?: number;
  /** Cooldown in ms before resetting. Default: 5 minutes */
  resetMs?: number;
}

export class WebhookCircuitBreakerService {
  private readonly threshold: number;
  private readonly resetMs: number;

  private static readonly SCRIPT = `
    local failures = redis.call('INCR', KEYS[1])
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    if failures >= tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], ARGV[3], 'PX', ARGV[4])
    end
    return failures
  `;

  constructor(private redis: RedisLike | null, opts?: CircuitBreakerOptions) {
    this.threshold = opts?.threshold ?? 10;
    this.resetMs = opts?.resetMs ?? 5 * 60 * 1000;
  }

  async isCircuitOpen(endpointId: string): Promise<boolean> {
    if (!this.redis) return false;

    const openedAt = await this.redis.get(`circuit:open:${endpointId}`);
    if (!openedAt) return false;

    if (Date.now() - parseInt(openedAt, 10) < this.resetMs) return true;

    await this.redis.del(`circuit:open:${endpointId}`);
    await this.redis.del(`circuit:failures:${endpointId}`);
    return false;
  }

  async recordFailure(endpointId: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.eval(
        WebhookCircuitBreakerService.SCRIPT,
        2,
        `circuit:failures:${endpointId}`,
        `circuit:open:${endpointId}`,
        600,
        this.threshold,
        String(Date.now()),
        this.resetMs,
      );
    } catch {
      // Non-atomic fallback
      const failures = await this.redis.incr(`circuit:failures:${endpointId}`);
      await this.redis.expire(`circuit:failures:${endpointId}`, 600);
      if (failures >= this.threshold) {
        await this.redis.set(`circuit:open:${endpointId}`, String(Date.now()), 'PX', this.resetMs);
      }
    }
  }

  async recordSuccess(endpointId: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(`circuit:failures:${endpointId}`);
    await this.redis.del(`circuit:open:${endpointId}`);
  }
}
