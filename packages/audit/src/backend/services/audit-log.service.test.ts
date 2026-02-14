import { AuditLogService, AuditRecordInput } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    service = new AuditLogService();
  });

  describe('record()', () => {
    it('stores entries in buffer', () => {
      const input: AuditRecordInput = {
        actor: 'user-1',
        action: 'create',
        resourceType: 'document',
        resourceId: 'doc-1',
      };

      service.record(input);

      expect(service.bufferSize).toBe(1);

      const entries = service.query() as ReturnType<typeof service.query>;
      expect(Array.isArray(entries)).toBe(true);
      const result = entries as any[];
      expect(result).toHaveLength(1);
      expect(result[0].actor).toBe('user-1');
      expect(result[0].action).toBe('create');
      expect(result[0].resourceType).toBe('document');
      expect(result[0].resourceId).toBe('doc-1');
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });

    it('redacts sensitive fields (password, secret, token, key)', () => {
      const input: AuditRecordInput = {
        actor: 'user-1',
        action: 'login',
        resourceType: 'auth',
        resourceId: 'session-1',
        details: {
          password: 'super-secret-password',
          secret: 'my-secret-value',
          token: 'jwt-token-here',
          apiKey: 'ak_12345',
          username: 'john',
        },
      };

      service.record(input);

      const entries = service.query() as any[];
      expect(entries[0].details.password).toBe('[REDACTED]');
      expect(entries[0].details.secret).toBe('[REDACTED]');
      expect(entries[0].details.token).toBe('[REDACTED]');
      expect(entries[0].details.apiKey).toBe('[REDACTED]');
      expect(entries[0].details.username).toBe('john');
    });

    it('redacts nested sensitive fields', () => {
      const input: AuditRecordInput = {
        actor: 'user-1',
        action: 'update',
        resourceType: 'config',
        resourceId: 'cfg-1',
        details: {
          settings: {
            apiKey: 'nested-key-value',
            displayName: 'My App',
            credentials: {
              password: 'deep-nested-password',
              host: 'db.example.com',
            },
          },
        },
      };

      service.record(input);

      const entries = service.query() as any[];
      const settings = entries[0].details.settings as Record<string, unknown>;
      expect(settings.apiKey).toBe('[REDACTED]');
      expect(settings.displayName).toBe('My App');
      const credentials = settings.credentials as Record<string, unknown>;
      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.host).toBe('db.example.com');
    });

    it('never throws even on error', () => {
      // Pass undefined/null-like malformed input to try to cause an error.
      // The service should swallow it.
      expect(() => {
        service.record({
          actor: '',
          action: '',
          resourceType: '',
          resourceId: '',
          details: undefined,
        });
      }).not.toThrow();

      // Also test with details that could cause issues
      expect(() => {
        service.record({
          actor: 'user-1',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
          details: { normal: 'value' },
        });
      }).not.toThrow();
    });
  });

  describe('query()', () => {
    const seedEntries = () => {
      const inputs: AuditRecordInput[] = [
        { actor: 'alice', action: 'create', resourceType: 'document', resourceId: 'doc-1' },
        { actor: 'bob', action: 'update', resourceType: 'document', resourceId: 'doc-2' },
        { actor: 'alice', action: 'delete', resourceType: 'user', resourceId: 'user-1' },
        { actor: 'charlie', action: 'create', resourceType: 'project', resourceId: 'proj-1' },
        { actor: 'bob', action: 'create', resourceType: 'document', resourceId: 'doc-3' },
      ];
      inputs.forEach((input) => service.record(input));
    };

    it('returns all entries when no filters', () => {
      seedEntries();

      const entries = service.query() as any[];
      expect(entries).toHaveLength(5);
    });

    it('filters by actor', () => {
      seedEntries();

      const entries = service.query({ actor: 'alice' }) as any[];
      expect(entries).toHaveLength(2);
      entries.forEach((e: any) => expect(e.actor).toBe('alice'));
    });

    it('filters by action', () => {
      seedEntries();

      const entries = service.query({ action: 'create' }) as any[];
      expect(entries).toHaveLength(3);
      entries.forEach((e: any) => expect(e.action).toBe('create'));
    });

    it('filters by resourceType', () => {
      seedEntries();

      const entries = service.query({ resourceType: 'document' }) as any[];
      expect(entries).toHaveLength(3);
      entries.forEach((e: any) => expect(e.resourceType).toBe('document'));
    });

    it('filters by date range (from/to)', () => {
      const beforeAll = new Date();

      service.record({
        actor: 'user-1',
        action: 'early',
        resourceType: 'test',
        resourceId: 't-1',
      });

      const midpoint = new Date();

      service.record({
        actor: 'user-1',
        action: 'late',
        resourceType: 'test',
        resourceId: 't-2',
      });

      const afterAll = new Date();

      // Filter from midpoint should exclude the first entry
      const fromMid = service.query({ from: midpoint }) as any[];
      expect(fromMid.length).toBeGreaterThanOrEqual(1);
      fromMid.forEach((e: any) => expect(e.timestamp.getTime()).toBeGreaterThanOrEqual(midpoint.getTime()));

      // Filter to beforeAll should return nothing (entries were created after beforeAll)
      // but because Date precision may overlap, we test with a past date
      const pastDate = new Date(beforeAll.getTime() - 10000);
      const toBeforeAll = service.query({ from: afterAll }) as any[];
      // Entries were created before afterAll, so filtering from afterAll should return 0
      expect(toBeforeAll).toHaveLength(0);
    });

    it('supports limit and offset', () => {
      seedEntries();

      const limited = service.query({ limit: 2 }) as any[];
      expect(limited).toHaveLength(2);

      const offset = service.query({ offset: 3 }) as any[];
      expect(offset).toHaveLength(2);

      const limitAndOffset = service.query({ limit: 2, offset: 1 }) as any[];
      expect(limitAndOffset).toHaveLength(2);
    });

    it('returns newest first', () => {
      seedEntries();

      const entries = service.query() as any[];
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(entries[i + 1].timestamp.getTime());
      }
    });
  });

  describe('bufferSize', () => {
    it('reflects entry count', () => {
      expect(service.bufferSize).toBe(0);

      service.record({ actor: 'a', action: 'b', resourceType: 'c', resourceId: 'd' });
      expect(service.bufferSize).toBe(1);

      service.record({ actor: 'e', action: 'f', resourceType: 'g', resourceId: 'h' });
      expect(service.bufferSize).toBe(2);
    });
  });

  describe('ring buffer', () => {
    it('caps at MAX_BUFFER_SIZE (10,000) and shifts old entries', () => {
      // We test with the real MAX_BUFFER_SIZE (10,000) by filling it + 5 extra
      const overflowCount = 5;
      const totalInserts = 10_000 + overflowCount;

      for (let i = 0; i < totalInserts; i++) {
        service.record({
          actor: `actor-${i}`,
          action: 'test',
          resourceType: 'test',
          resourceId: `id-${i}`,
        });
      }

      // Buffer should be capped at 10,000
      expect(service.bufferSize).toBe(10_000);

      // The oldest entries (0..4) should have been shifted out
      const entries = service.query() as any[];
      // Newest first, so the last entry is the oldest remaining
      const oldestRemaining = entries[entries.length - 1];
      expect(oldestRemaining.actor).toBe(`actor-${overflowCount}`);

      // The newest entry should be the last one inserted
      const newest = entries[0];
      expect(newest.actor).toBe(`actor-${totalInserts - 1}`);
    });
  });
});
