import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

interface AuditEntry {
  actorId?: string;
  actorRole?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

function computeHash(entry: AuditEntry, previousHash: string | null): string {
  const data = JSON.stringify({
    ...entry,
    previousHash,
    timestamp: Date.now(),
  });
  return createHash('sha256').update(data).digest('hex');
}

export async function createAuditLog(
  prisma: PrismaClient,
  entry: AuditEntry
): Promise<void> {
  const lastEntry = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { entryHash: true },
  });

  const previousHash = lastEntry?.entryHash ?? null;
  const entryHash = computeHash(entry, previousHash);

  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      tenantId: entry.tenantId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : undefined,
      after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      previousHash,
      entryHash,
    },
  });
}
