import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient, AuditAction } from '@prisma/client';
import { logAudit } from '../../src/services/audit.service.js';

const prisma = new PrismaClient();

describe('Audit Service', () => {
  let testUserId: string;
  let testRoleId: string;

  beforeEach(async () => {
    // Clean up test audit logs
    await prisma.auditLog.deleteMany({
      where: { entityType: 'TEST' },
    });

    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: '@audit-test.com' } },
    });
    await prisma.role.deleteMany({
      where: { name: 'Audit Test Role' },
    });

    // Create test role
    const role = await prisma.role.create({
      data: {
        name: 'Audit Test Role',
        description: 'Test role for audit service tests',
        level: 1,
      },
    });
    testRoleId = role.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@audit-test.com',
        passwordHash: 'hashed',
        firstName: 'Audit',
        lastName: 'Tester',
        roleId: testRoleId,
      },
    });
    testUserId = user.id;
  });

  it('should log CREATE action', async () => {
    await logAudit(prisma, {
      entityType: 'TEST',
      entityId: 'test-123',
      action: AuditAction.CREATE,
      userId: testUserId,
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
      userId: testUserId,
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
      userId: testUserId,
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
