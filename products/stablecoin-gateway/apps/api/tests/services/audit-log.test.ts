import { AuditLogService, AuditEntry } from '../../src/services/audit-log.service';

describe('AuditLogService', () => {
  let auditService: AuditLogService;

  beforeEach(() => {
    auditService = new AuditLogService();
  });

  describe('record()', () => {
    it('should create an audit entry with all required fields', () => {
      auditService.record({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_abc',
      });

      const entries = auditService.query({});
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_abc',
      });
    });

    it('should add a timestamp automatically', () => {
      const before = new Date();

      auditService.record({
        actor: 'user-123',
        action: 'delete',
        resourceType: 'webhook',
        resourceId: 'wh_xyz',
      });

      const after = new Date();
      const entries = auditService.query({});

      expect(entries[0].timestamp).toBeInstanceOf(Date);
      expect(entries[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entries[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store optional details', () => {
      auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'webhook',
        resourceId: 'wh_xyz',
        details: { oldUrl: 'https://old.example.com', newUrl: 'https://new.example.com' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        oldUrl: 'https://old.example.com',
        newUrl: 'https://new.example.com',
      });
    });

    it('should store IP address and user agent from request context', () => {
      auditService.record({
        actor: 'user-456',
        action: 'login',
        resourceType: 'user',
        resourceId: 'user-456',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      });

      const entries = auditService.query({});
      expect(entries[0].ip).toBe('192.168.1.100');
      expect(entries[0].userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });

    it('should record multiple entries in order', () => {
      auditService.record({
        actor: 'user-1',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });
      auditService.record({
        actor: 'user-2',
        action: 'delete',
        resourceType: 'api_key',
        resourceId: 'ak_2',
      });

      const entries = auditService.query({});
      expect(entries).toHaveLength(2);
      expect(entries[0].actor).toBe('user-1');
      expect(entries[1].actor).toBe('user-2');
    });
  });

  describe('sensitive field redaction', () => {
    it('should redact password fields in details', () => {
      auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'user',
        resourceId: 'user-123',
        details: { password: 'my-secret-password', email: 'user@example.com' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        password: '[REDACTED]',
        email: 'user@example.com',
      });
    });

    it('should redact secret fields in details', () => {
      auditService.record({
        actor: 'system',
        action: 'create',
        resourceType: 'webhook',
        resourceId: 'wh_1',
        details: { webhookSecret: 'whsec_abc123', url: 'https://example.com/hook' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        webhookSecret: '[REDACTED]',
        url: 'https://example.com/hook',
      });
    });

    it('should redact token fields in details', () => {
      auditService.record({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
        details: { accessToken: 'eyJhbGciOiJIUzI1NiJ9...', name: 'My API Key' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        accessToken: '[REDACTED]',
        name: 'My API Key',
      });
    });

    it('should redact key fields in details', () => {
      auditService.record({
        actor: 'admin',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_2',
        details: { apiKey: 'sk_live_abc123', label: 'Production' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        apiKey: '[REDACTED]',
        label: 'Production',
      });
    });

    it('should redact authorization fields in details', () => {
      auditService.record({
        actor: 'user-123',
        action: 'login',
        resourceType: 'user',
        resourceId: 'user-123',
        details: { authorization: 'Bearer eyJ...', method: 'POST' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        authorization: '[REDACTED]',
        method: 'POST',
      });
    });

    it('should redact sensitive keys case-insensitively', () => {
      auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'user',
        resourceId: 'user-123',
        details: { Password: 'secret', SECRET_KEY: 'hidden', AccessToken: 'jwt' },
      });

      const entries = auditService.query({});
      expect(entries[0].details).toEqual({
        Password: '[REDACTED]',
        SECRET_KEY: '[REDACTED]',
        AccessToken: '[REDACTED]',
      });
    });

    it('should redact sensitive fields in nested objects', () => {
      auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'webhook',
        resourceId: 'wh_1',
        details: {
          config: {
            url: 'https://example.com',
            secret: 'whsec_nested_secret',
          },
        },
      });

      const entries = auditService.query({});
      const config = entries[0].details?.config as Record<string, unknown>;
      expect(config.url).toBe('https://example.com');
      expect(config.secret).toBe('[REDACTED]');
    });

    it('should not redact when details are not provided', () => {
      auditService.record({
        actor: 'user-123',
        action: 'delete',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });

      const entries = auditService.query({});
      expect(entries[0].details).toBeUndefined();
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      // Seed entries for query tests
      auditService.record({
        actor: 'user-1',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });
      auditService.record({
        actor: 'user-2',
        action: 'delete',
        resourceType: 'webhook',
        resourceId: 'wh_1',
      });
      auditService.record({
        actor: 'user-1',
        action: 'update',
        resourceType: 'webhook',
        resourceId: 'wh_2',
      });
      auditService.record({
        actor: 'system',
        action: 'refund',
        resourceType: 'payment_session',
        resourceId: 'ps_1',
      });
    });

    it('should return all entries when no filters are provided', () => {
      const results = auditService.query({});
      expect(results).toHaveLength(4);
    });

    it('should filter by actor', () => {
      const results = auditService.query({ actor: 'user-1' });
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.actor === 'user-1')).toBe(true);
    });

    it('should filter by action', () => {
      const results = auditService.query({ action: 'delete' });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('delete');
      expect(results[0].resourceId).toBe('wh_1');
    });

    it('should filter by resourceType', () => {
      const results = auditService.query({ resourceType: 'webhook' });
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.resourceType === 'webhook')).toBe(true);
    });

    it('should filter by multiple criteria simultaneously', () => {
      const results = auditService.query({
        actor: 'user-1',
        resourceType: 'webhook',
      });
      expect(results).toHaveLength(1);
      expect(results[0].resourceId).toBe('wh_2');
    });

    it('should filter by date range with from', () => {
      // All seeded entries are created "now", so a from in the past
      // should return all of them
      const pastDate = new Date(Date.now() - 60000);
      const results = auditService.query({ from: pastDate });
      expect(results).toHaveLength(4);
    });

    it('should filter by date range with to', () => {
      // A to date in the past should return nothing
      const pastDate = new Date(Date.now() - 60000);
      const results = auditService.query({ to: pastDate });
      expect(results).toHaveLength(0);
    });

    it('should filter by date range with both from and to', () => {
      const from = new Date(Date.now() - 60000);
      const to = new Date(Date.now() + 60000);
      const results = auditService.query({ from, to });
      expect(results).toHaveLength(4);
    });

    it('should return empty array when no entries match', () => {
      const results = auditService.query({ actor: 'nonexistent-user' });
      expect(results).toHaveLength(0);
    });
  });

  describe('fire-and-forget behavior', () => {
    it('should not throw when record() encounters an internal error', () => {
      // Monkey-patch the internal store to force an error
      const brokenService = new AuditLogService();
      Object.defineProperty(brokenService, 'entries', {
        get() {
          throw new Error('Storage failure');
        },
      });

      // record() must not throw, even when storage fails
      expect(() => {
        brokenService.record({
          actor: 'user-123',
          action: 'create',
          resourceType: 'api_key',
          resourceId: 'ak_1',
        });
      }).not.toThrow();
    });

    it('should log an error when record() fails internally', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const brokenService = new AuditLogService();
      Object.defineProperty(brokenService, 'entries', {
        get() {
          throw new Error('Storage failure');
        },
      });

      brokenService.record({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audit log write failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
