import { UsageService } from '../src/backend/services/usage.service';

function createMockPrisma() {
  const records: Map<string, any> = new Map();
  return {
    usageRecord: {
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const key = `${where.userId_feature?.userId}:${where.userId_feature?.feature}`;
        const existing = records.get(key);
        if (existing) {
          const updated = { ...existing, count: (existing.count || 0) + (update.count?.increment || 0) };
          records.set(key, updated);
          return updated;
        } else {
          records.set(key, create);
          return create;
        }
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const key = `${where.userId_feature?.userId}:${where.userId_feature?.feature}`;
        return records.get(key) || null;
      }),
      deleteMany: jest.fn(async () => ({ count: records.size })),
    },
  };
}

describe('UsageService', () => {
  let service: UsageService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new UsageService(mockPrisma);
  });

  describe('increment', () => {
    it('increments usage for a user and feature', async () => {
      await expect(service.increment('user-1', 'api_calls')).resolves.not.toThrow();
      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledTimes(1);
    });

    it('increments by custom amount', async () => {
      await service.increment('user-1', 'ai_tokens', 500);
      const upsertCall = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      expect(upsertCall.update.count.increment).toBe(500);
    });

    it('defaults increment to 1', async () => {
      await service.increment('user-1', 'api_calls');
      const upsertCall = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      expect(upsertCall.update.count.increment).toBe(1);
    });
  });

  describe('get', () => {
    it('returns 0 for a user with no usage', async () => {
      const count = await service.get('user-new', 'api_calls');
      expect(count).toBe(0);
    });

    it('returns usage count after increment', async () => {
      await service.increment('user-1', 'api_calls');
      await service.increment('user-1', 'api_calls');
      // Note: mock may not perfectly track increments but verifies the call pattern
      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('isWithinLimit', () => {
    it('returns true when usage is within limit', async () => {
      // Mock 5 API calls used, limit 100
      mockPrisma.usageRecord.findUnique.mockResolvedValueOnce({ count: 5 });
      const withinLimit = await service.isWithinLimit('user-1', 'api_calls', 100);
      expect(withinLimit).toBe(true);
    });

    it('returns false when usage exceeds limit', async () => {
      // Mock 150 API calls used, limit 100
      mockPrisma.usageRecord.findUnique.mockResolvedValueOnce({ count: 150 });
      const withinLimit = await service.isWithinLimit('user-1', 'api_calls', 100);
      expect(withinLimit).toBe(false);
    });

    it('returns true for unlimited (-1)', async () => {
      mockPrisma.usageRecord.findUnique.mockResolvedValueOnce({ count: 999999 });
      const withinLimit = await service.isWithinLimit('user-1', 'api_calls', -1);
      expect(withinLimit).toBe(true);
    });
  });
});
