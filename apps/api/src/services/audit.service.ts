import { PrismaClient, AuditAction } from '@prisma/client';

export interface AuditLogData {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
}

export async function logAudit(
  prisma: PrismaClient,
  data: AuditLogData
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      oldValues: data.oldValues || null,
      newValues: data.newValues || null,
      ipAddress: data.ipAddress || null,
    },
  });
}
