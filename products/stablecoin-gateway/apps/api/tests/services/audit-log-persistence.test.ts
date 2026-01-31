/**
 * Audit Log Persistence Tests
 *
 * Audit Issue #3: In-memory audit log entries are lost on restart.
 * The service must persist entries to the database.
 *
 * Tests verify that:
 * 1. record() persists entries to the database
 * 2. query() returns entries from the database (survives "restart")
 * 3. Sensitive field redaction still works with persistence
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogService } from '../../src/services/audit-log.service';

const prisma = new PrismaClient();

describe('Audit log persistence', () => {
  afterAll(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: {
        actor: { startsWith: 'persistence-test-' },
      },
    });
    await prisma.$disconnect();
  });

  it('should persist audit entries to the database', async () => {
    const service = new AuditLogService(prisma);
    const actor = `persistence-test-${Date.now()}`;

    await service.record({
      actor,
      action: 'create',
      resourceType: 'api_key',
      resourceId: 'ak_persist_1',
      details: { name: 'Test Key' },
    });

    // Query directly from DB to verify persistence
    const dbEntries = await prisma.auditLog.findMany({
      where: { actor },
    });

    expect(dbEntries).toHaveLength(1);
    expect(dbEntries[0].action).toBe('create');
    expect(dbEntries[0].resourceType).toBe('api_key');
    expect(dbEntries[0].resourceId).toBe('ak_persist_1');
  });

  it('should survive service restart (new instance reads persisted data)', async () => {
    const actor = `persistence-test-restart-${Date.now()}`;

    // First service instance writes
    const service1 = new AuditLogService(prisma);
    await service1.record({
      actor,
      action: 'delete',
      resourceType: 'webhook',
      resourceId: 'wh_persist_1',
    });

    // Simulate restart: create a new service instance
    const service2 = new AuditLogService(prisma);
    const entries = await service2.query({ actor });

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('delete');
    expect(entries[0].resourceId).toBe('wh_persist_1');
  });

  it('should persist entries with redacted sensitive fields', async () => {
    const service = new AuditLogService(prisma);
    const actor = `persistence-test-redact-${Date.now()}`;

    await service.record({
      actor,
      action: 'update',
      resourceType: 'user',
      resourceId: 'user_1',
      details: { password: 'super-secret', email: 'test@test.com' },
    });

    const entries = await service.query({ actor });
    expect(entries).toHaveLength(1);
    expect(entries[0].details).toEqual({
      password: '[REDACTED]',
      email: 'test@test.com',
    });
  });

  it('should persist ip and userAgent fields', async () => {
    const service = new AuditLogService(prisma);
    const actor = `persistence-test-meta-${Date.now()}`;

    await service.record({
      actor,
      action: 'login',
      resourceType: 'user',
      resourceId: 'user_2',
      ip: '10.0.0.1',
      userAgent: 'TestAgent/1.0',
    });

    const entries = await service.query({ actor });
    expect(entries).toHaveLength(1);
    expect(entries[0].ip).toBe('10.0.0.1');
    expect(entries[0].userAgent).toBe('TestAgent/1.0');
  });

  it('should query with all filter types from database', async () => {
    const service = new AuditLogService(prisma);
    const actor = `persistence-test-filter-${Date.now()}`;

    await service.record({
      actor,
      action: 'create',
      resourceType: 'api_key',
      resourceId: 'ak_f1',
    });
    await service.record({
      actor,
      action: 'delete',
      resourceType: 'webhook',
      resourceId: 'wh_f1',
    });

    // Filter by action
    const createEntries = await service.query({ actor, action: 'create' });
    expect(createEntries).toHaveLength(1);
    expect(createEntries[0].resourceId).toBe('ak_f1');

    // Filter by resourceType
    const webhookEntries = await service.query({ actor, resourceType: 'webhook' });
    expect(webhookEntries).toHaveLength(1);
    expect(webhookEntries[0].resourceId).toBe('wh_f1');

    // Filter by date range
    const from = new Date(Date.now() - 60000);
    const to = new Date(Date.now() + 60000);
    const rangeEntries = await service.query({ actor, from, to });
    expect(rangeEntries).toHaveLength(2);
  });
});
