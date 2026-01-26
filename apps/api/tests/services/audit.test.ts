import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient, AuditAction } from '@prisma/client';
import { logAudit } from '../../src/services/audit.service.js';

const prisma = new PrismaClient();

describe('Audit Service', () => {
  beforeEach(async () => {
    // Clean up test audit logs
    await prisma.auditLog.deleteMany({
      where: { entityType: 'TEST' },
    });
  });

  it('should log CREATE action', async () => {
    await logAudit(prisma, {
      entityType: 'TEST',
      entityId: 'test-123',
      action: AuditAction.CREATE,
      userId: 'user-123',
      newValues: { title: 'Test Item', status: 'NEW' },
      ipAddress: '127.0.0.1',
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'TEST', entityId: 'test-123' },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.CREATE);
    expect(logs[0].newValues).toEqual({ title: 'Test Item', status: 'NEW' });
    expect(logs[0].oldValues).toBeNull();
  });

  it('should log UPDATE action with old and new values', async () => {
    await logAudit(prisma, {
      entityType: 'TEST',
      entityId: 'test-456',
      action: AuditAction.UPDATE,
      userId: 'user-123',
      oldValues: { status: 'NEW' },
      newValues: { status: 'IN_PROGRESS' },
      ipAddress: '127.0.0.1',
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'TEST', entityId: 'test-456' },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.UPDATE);
    expect(logs[0].oldValues).toEqual({ status: 'NEW' });
    expect(logs[0].newValues).toEqual({ status: 'IN_PROGRESS' });
  });

  it('should log DELETE action', async () => {
    await logAudit(prisma, {
      entityType: 'TEST',
      entityId: 'test-789',
      action: AuditAction.DELETE,
      userId: 'user-123',
      oldValues: { title: 'Deleted Item' },
      ipAddress: '127.0.0.1',
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'TEST', entityId: 'test-789' },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe(AuditAction.DELETE);
  });
});
