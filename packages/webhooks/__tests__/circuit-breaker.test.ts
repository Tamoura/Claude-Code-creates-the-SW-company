import { WebhookCircuitBreakerService } from '../src/backend/services/circuit-breaker.service';

// In-memory Redis mock
class MockRedis {
  private store: Map<string, string> = new Map();
  private expiries: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    if (this.expiries.has(key) && Date.now() > (this.expiries.get(key) || 0)) {
      this.store.delete(key);
      this.expiries.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string> {
    this.store.set(key, value);
    const pxIndex = args.indexOf('PX');
    if (pxIndex !== -1 && args[pxIndex + 1]) {
      this.expiries.set(key, Date.now() + parseInt(args[pxIndex + 1]));
    }
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) || '0', 10);
    const next = current + 1;
    this.store.set(key, String(next));
    return next;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async eval(_script: string, _numkeys: number, ...args: any[]): Promise<any> {
    // Simplified: just increment the failure counter
    const failureKey = args[0] as string;
    const openKey = args[1] as string;
    const threshold = parseInt(args[3] as string, 10);
    const openValue = args[2] as string;
    const ttlMs = parseInt(args[4] as string, 10);

    const count = await this.incr(failureKey);
    if (count >= threshold) {
      await this.set(openKey, openValue, 'PX', ttlMs);
    }
    return count;
  }

  clear(): void {
    this.store.clear();
    this.expiries.clear();
  }
}

describe('WebhookCircuitBreakerService', () => {
  let redis: MockRedis;
  let service: WebhookCircuitBreakerService;

  beforeEach(() => {
    redis = new MockRedis();
    service = new WebhookCircuitBreakerService(redis, { threshold: 3, resetMs: 60000 });
  });

  describe('isCircuitOpen', () => {
    it('returns false when no failures recorded', async () => {
      expect(await service.isCircuitOpen('endpoint-1')).toBe(false);
    });

    it('returns false with null redis', async () => {
      const nullService = new WebhookCircuitBreakerService(null);
      expect(await nullService.isCircuitOpen('endpoint-1')).toBe(false);
    });
  });

  describe('resetCircuit', () => {
    it('clears circuit state', async () => {
      await redis.set('circuit:open:endpoint-1', String(Date.now()));
      // First verify it would be open
      const openBefore = await service.isCircuitOpen('endpoint-1');
      expect(openBefore).toBe(true);

      await service.resetCircuit('endpoint-1');
      expect(await service.isCircuitOpen('endpoint-1')).toBe(false);
    });
  });

  describe('null redis graceful degradation', () => {
    it('recordFailure does not throw without redis', async () => {
      const nullService = new WebhookCircuitBreakerService(null);
      await expect(nullService.recordFailure('endpoint-1')).resolves.not.toThrow();
    });

    it('resetCircuit does not throw without redis', async () => {
      const nullService = new WebhookCircuitBreakerService(null);
      await expect(nullService.resetCircuit('endpoint-1')).resolves.not.toThrow();
    });
  });
});
