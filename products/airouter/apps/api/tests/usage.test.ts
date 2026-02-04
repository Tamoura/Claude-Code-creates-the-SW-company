import './setup';
import { UsageService } from '../src/services/usage.service';

function createMockPrisma(records: any[] = []) {
  const store: Map<string, any> = new Map();

  // Pre-populate store from records
  for (const rec of records) {
    const key = `${rec.userId}:${rec.provider}:${rec.date}`;
    store.set(key, { ...rec });
  }

  return {
    usageRecord: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.userId_provider_date) {
          const { userId, provider, date } = where.userId_provider_date;
          const key = `${userId}:${provider}:${date}`;
          return Promise.resolve(store.get(key) || null);
        }
        return Promise.resolve(null);
      }),
      upsert: jest.fn().mockImplementation(({ where, update, create }) => {
        const { userId, provider, date } = where.userId_provider_date;
        const key = `${userId}:${provider}:${date}`;
        const existing = store.get(key);
        if (existing) {
          existing.requestCount += update.requestCount?.increment || 0;
          existing.tokenCount += update.tokenCount?.increment || 0;
          store.set(key, existing);
          return Promise.resolve(existing);
        }
        const newRecord = { ...create, id: `rec-${Date.now()}` };
        store.set(key, newRecord);
        return Promise.resolve(newRecord);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const results: any[] = [];
        store.forEach((val) => {
          if (val.userId === where.userId) {
            if (!where.provider || val.provider === where.provider) {
              results.push(val);
            }
          }
        });
        return Promise.resolve(results);
      }),
    },
  } as any;
}

describe('UsageService', () => {
  describe('recordUsage', () => {
    it('should create a new usage record', async () => {
      const prisma = createMockPrisma();
      const service = new UsageService(prisma);

      await service.recordUsage('user1', 'groq', 100);

      expect(prisma.usageRecord.upsert).toHaveBeenCalledTimes(1);
    });

    it('should increment existing usage', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 5, tokenCount: 500 },
      ]);
      const service = new UsageService(prisma);

      await service.recordUsage('user1', 'groq', 200);

      const result = await service.getTodayUsage('user1', 'groq');
      expect(result.requestCount).toBe(6);
      expect(result.tokenCount).toBe(700);
    });
  });

  describe('getTodayUsage', () => {
    it('should return zero for no usage', async () => {
      const prisma = createMockPrisma();
      const service = new UsageService(prisma);

      const result = await service.getTodayUsage('user1', 'groq');
      expect(result.requestCount).toBe(0);
      expect(result.tokenCount).toBe(0);
    });

    it('should return current usage', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 42, tokenCount: 5000 },
      ]);
      const service = new UsageService(prisma);

      const result = await service.getTodayUsage('user1', 'groq');
      expect(result.requestCount).toBe(42);
      expect(result.tokenCount).toBe(5000);
    });
  });

  describe('getRemainingCapacity', () => {
    it('should return 1.0 for unlimited providers', async () => {
      const prisma = createMockPrisma();
      const service = new UsageService(prisma);

      const capacity = await service.getRemainingCapacity('user1', 'sambanova');
      expect(capacity).toBe(1.0);
    });

    it('should return 0 for unknown providers', async () => {
      const prisma = createMockPrisma();
      const service = new UsageService(prisma);

      const capacity = await service.getRemainingCapacity('user1', 'nonexistent');
      expect(capacity).toBe(0);
    });

    it('should calculate remaining for request-per-day limits', async () => {
      const today = new Date().toISOString().slice(0, 10);
      // Groq has 1000 RPD
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 500, tokenCount: 0 },
      ]);
      const service = new UsageService(prisma);

      const capacity = await service.getRemainingCapacity('user1', 'groq');
      expect(capacity).toBe(0.5); // 500/1000 used = 50% remaining
    });

    it('should return 0 when daily limit is exhausted', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 1000, tokenCount: 0 },
      ]);
      const service = new UsageService(prisma);

      const capacity = await service.getRemainingCapacity('user1', 'groq');
      expect(capacity).toBe(0);
    });

    it('should calculate for token-per-day limits', async () => {
      const today = new Date().toISOString().slice(0, 10);
      // Cerebras has 1M tokens/day
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'cerebras', date: today, requestCount: 10, tokenCount: 250000 },
      ]);
      const service = new UsageService(prisma);

      const capacity = await service.getRemainingCapacity('user1', 'cerebras');
      expect(capacity).toBe(0.75); // 250K/1M used = 75% remaining
    });
  });

  describe('getUsageStats', () => {
    it('should return empty for no usage', async () => {
      const prisma = createMockPrisma();
      const service = new UsageService(prisma);

      const stats = await service.getUsageStats('user1');
      expect(stats).toEqual([]);
    });

    it('should return usage with remaining capacity info', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 100, tokenCount: 5000 },
      ]);
      const service = new UsageService(prisma);

      const stats = await service.getUsageStats('user1');
      expect(stats.length).toBe(1);
      expect(stats[0].provider).toBe('groq');
      expect(stats[0].requestCount).toBe(100);
      expect(stats[0].remaining).toBeDefined();
      expect(stats[0].remaining!.requests).toBe(900); // 1000 - 100
    });

    it('should filter by provider when specified', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma([
        { userId: 'user1', provider: 'groq', date: today, requestCount: 50, tokenCount: 1000 },
        { userId: 'user1', provider: 'cerebras', date: today, requestCount: 10, tokenCount: 500 },
      ]);
      const service = new UsageService(prisma);

      const stats = await service.getUsageStats('user1', 'groq');
      expect(stats.length).toBe(1);
      expect(stats[0].provider).toBe('groq');
    });
  });
});
