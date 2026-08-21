import { AuditLogService, AuditRecordInput } from '../src/backend/services/audit-log.service';

function createMockPrisma() {
  const entries: any[] = [];
  return {
    auditLog: {
      create: jest.fn(async ({ data }: { data: any }) => {
        const entry = { id: `audit-${entries.length + 1}`, ...data };
        entries.push(entry);
        return entry;
      }),
      findMany: jest.fn(async ({ where }: { where: any }) => {
        return entries.filter(e => {
          if (where.actor && e.actor !== where.actor) return false;
          if (where.action && e.action !== where.action) return false;
          return true;
        });
      }),
      count: jest.fn(async () => entries.length),
    },
    _entries: entries,
  };
}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new AuditLogService(mockPrisma);
  });

  describe('record', () => {
    it('records an audit entry without throwing', async () => {
      const input: AuditRecordInput = {
        actor: 'user-123',
        action: 'CREATE_PAYMENT',
        resourceType: 'Transaction',
        resourceId: 'pay-456',
        ip: '192.168.1.1',
      };

      await expect(service.record(input)).resolves.not.toThrow();
    });

    it('calls prisma to persist the entry', async () => {
      await service.record({
        actor: 'user-123',
        action: 'DELETE_API_KEY',
        resourceType: 'ApiKey',
        resourceId: 'key-789',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('redacts sensitive fields in details', async () => {
      await service.record({
        actor: 'user-123',
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: 'user-123',
        details: { email: 'user@test.com', password: 'super-secret' },
      });

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0];
      const details = JSON.parse(createCall.data.details);
      expect(details.password).toBe('[REDACTED]');
      expect(details.email).toBe('user@test.com');
    });

    it('does not throw even if prisma fails (fire-and-forget)', async () => {
      const failingPrisma = {
        auditLog: {
          create: jest.fn().mockRejectedValue(new Error('DB connection failed')),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      };
      const resilientService = new AuditLogService(failingPrisma);

      await expect(
        resilientService.record({
          actor: 'user-123',
          action: 'TEST_ACTION',
          resourceType: 'Test',
          resourceId: 'test-1',
        })
      ).resolves.not.toThrow();
    });

    it('includes timestamp in the recorded entry', async () => {
      const before = new Date();
      await service.record({
        actor: 'user-1',
        action: 'TEST',
        resourceType: 'Test',
        resourceId: 'id-1',
      });
      const after = new Date();

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0];
      const ts = new Date(createCall.data.timestamp);
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(ts.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await service.record({ actor: 'user-1', action: 'CREATE', resourceType: 'Payment', resourceId: 'p-1' });
      await service.record({ actor: 'user-1', action: 'DELETE', resourceType: 'ApiKey', resourceId: 'k-1' });
      await service.record({ actor: 'user-2', action: 'CREATE', resourceType: 'Payment', resourceId: 'p-2' });
    });

    it('queries all entries', async () => {
      const result = await service.query({});
      expect(result.entries.length).toBeGreaterThanOrEqual(3);
    });

    it('filters by actor', async () => {
      const result = await service.query({ actor: 'user-1' });
      result.entries.forEach(e => expect(e.actor).toBe('user-1'));
    });
  });
});
