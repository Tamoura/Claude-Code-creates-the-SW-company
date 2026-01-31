/**
 * AuditLogService Tests
 *
 * Tests audit trail functionality including recording entries,
 * PII redaction, querying with filters, and fire-and-forget behavior.
 * Now backed by the database via Prisma.
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogService } from '../../src/services/audit-log.service';

const prisma = new PrismaClient();

describe('AuditLogService', () => {
  let auditService: AuditLogService;

  beforeAll(async () => {
    auditService = new AuditLogService(prisma);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.$disconnect();
  });

  describe('record()', () => {
    it('should create an audit entry with all required fields', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_abc',
      });

      const entries = await auditService.query({});
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_abc',
      });
    });

    it('should add a timestamp automatically', async () => {
      const before = new Date();

      await auditService.record({
        actor: 'user-123',
        action: 'delete',
        resourceType: 'webhook',
        resourceId: 'wh_xyz',
      });

      const after = new Date();
      const entries = await auditService.query({});

      expect(entries[0].timestamp).toBeInstanceOf(Date);
      expect(entries[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entries[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store optional details', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'webhook',
        resourceId: 'wh_xyz',
        details: { oldUrl: 'https://old.example.com', newUrl: 'https://new.example.com' },
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toEqual({
        oldUrl: 'https://old.example.com',
        newUrl: 'https://new.example.com',
      });
    });

    it('should store IP address and user agent from request context', async () => {
      await auditService.record({
        actor: 'user-456',
        action: 'login',
        resourceType: 'user',
        resourceId: 'user-456',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      });

      const entries = await auditService.query({});
      expect(entries[0].ip).toBe('192.168.1.100');
      expect(entries[0].userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });

    it('should record multiple entries', async () => {
      await auditService.record({
        actor: 'user-1',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });
      await auditService.record({
        actor: 'user-2',
        action: 'delete',
        resourceType: 'api_key',
        resourceId: 'ak_2',
      });

      const entries = await auditService.query({});
      expect(entries).toHaveLength(2);
    });
  });

  describe('sensitive field redaction', () => {
    it('should redact password fields in details', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'user',
        resourceId: 'user-123',
        details: { password: 'my-secret-password', email: 'user@example.com' },
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toEqual({
        password: '[REDACTED]',
        email: 'user@example.com',
      });
    });

    it('should redact secret fields in details', async () => {
      await auditService.record({
        actor: 'system',
        action: 'create',
        resourceType: 'webhook',
        resourceId: 'wh_1',
        details: { webhookSecret: 'whsec_abc123', url: 'https://example.com/hook' },
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toEqual({
        webhookSecret: '[REDACTED]',
        url: 'https://example.com/hook',
      });
    });

    it('should redact token fields in details', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
        details: { accessToken: 'eyJhbGciOiJIUzI1NiJ9...', name: 'My API Key' },
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toEqual({
        accessToken: '[REDACTED]',
        name: 'My API Key',
      });
    });

    it('should redact sensitive keys case-insensitively', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'update',
        resourceType: 'user',
        resourceId: 'user-123',
        details: { Password: 'secret', SECRET_KEY: 'hidden', AccessToken: 'jwt' },
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toEqual({
        Password: '[REDACTED]',
        SECRET_KEY: '[REDACTED]',
        AccessToken: '[REDACTED]',
      });
    });

    it('should redact sensitive fields in nested objects', async () => {
      await auditService.record({
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

      const entries = await auditService.query({});
      const config = entries[0].details?.config as Record<string, unknown>;
      expect(config.url).toBe('https://example.com');
      expect(config.secret).toBe('[REDACTED]');
    });

    it('should not redact when details are not provided', async () => {
      await auditService.record({
        actor: 'user-123',
        action: 'delete',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });

      const entries = await auditService.query({});
      expect(entries[0].details).toBeUndefined();
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      await auditService.record({
        actor: 'user-1',
        action: 'create',
        resourceType: 'api_key',
        resourceId: 'ak_1',
      });
      await auditService.record({
        actor: 'user-2',
        action: 'delete',
        resourceType: 'webhook',
        resourceId: 'wh_1',
      });
      await auditService.record({
        actor: 'user-1',
        action: 'update',
        resourceType: 'webhook',
        resourceId: 'wh_2',
      });
      await auditService.record({
        actor: 'system',
        action: 'refund',
        resourceType: 'payment_session',
        resourceId: 'ps_1',
      });
    });

    it('should return all entries when no filters are provided', async () => {
      const results = await auditService.query({});
      expect(results).toHaveLength(4);
    });

    it('should filter by actor', async () => {
      const results = await auditService.query({ actor: 'user-1' });
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.actor === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const results = await auditService.query({ action: 'delete' });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('delete');
      expect(results[0].resourceId).toBe('wh_1');
    });

    it('should filter by resourceType', async () => {
      const results = await auditService.query({ resourceType: 'webhook' });
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.resourceType === 'webhook')).toBe(true);
    });

    it('should filter by multiple criteria simultaneously', async () => {
      const results = await auditService.query({
        actor: 'user-1',
        resourceType: 'webhook',
      });
      expect(results).toHaveLength(1);
      expect(results[0].resourceId).toBe('wh_2');
    });

    it('should filter by date range', async () => {
      const from = new Date(Date.now() - 60000);
      const to = new Date(Date.now() + 60000);
      const results = await auditService.query({ from, to });
      expect(results).toHaveLength(4);

      // Past range should return nothing
      const pastDate = new Date(Date.now() - 60000);
      const pastResults = await auditService.query({ to: new Date('2020-01-01') });
      expect(pastResults).toHaveLength(0);
    });

    it('should return empty array when no entries match', async () => {
      const results = await auditService.query({ actor: 'nonexistent-user' });
      expect(results).toHaveLength(0);
    });
  });

  describe('fire-and-forget behavior', () => {
    it('should not throw on database write failure', async () => {
      const badPrisma = new PrismaClient({
        datasources: { db: { url: 'postgresql://invalid:5432/nonexistent' } },
      });
      const badService = new AuditLogService(badPrisma);

      await expect(
        badService.record({
          actor: 'user-123',
          action: 'create',
          resourceType: 'api_key',
          resourceId: 'ak_1',
        })
      ).resolves.not.toThrow();

      await badPrisma.$disconnect().catch(() => {});
    });
  });
});
