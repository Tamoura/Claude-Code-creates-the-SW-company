/**
 * Audit Log Service
 *
 * Provides a dedicated audit trail for security-critical
 * administrative actions such as API key management, webhook
 * modifications, refund processing, and authentication events.
 *
 * Design:
 * - Database-backed persistence via Prisma (survives restarts)
 * - Sensitive field redaction (passwords, tokens, secrets)
 * - Fire-and-forget: record() never throws
 * - Queryable by actor, action, resourceType, and date range
 *
 * SEC-011: Dedicated audit logging for administrative actions
 */

import { PrismaClient } from '@prisma/client';

export interface AuditEntry {
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export type AuditRecordInput = Omit<AuditEntry, 'timestamp'>;

export interface AuditQueryFilters {
  actor?: string;
  action?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
}

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'key', 'authorization'];

/**
 * Check whether a detail key matches any sensitive pattern.
 * Comparison is case-insensitive.
 */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

/**
 * Deep-clone a details object, replacing values of sensitive keys
 * with '[REDACTED]'. Handles nested plain objects recursively.
 */
function redactDetails(
  details: Record<string, unknown>
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      redacted[key] = redactDetails(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export class AuditLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Record an audit entry to the database.
   *
   * This method is intentionally fire-and-forget: it will never
   * throw an exception so that audit logging failures do not block
   * the main operation being audited.
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      const redactedDetails = input.details
        ? redactDetails(input.details)
        : undefined;

      await this.prisma.auditLog.create({
        data: {
          actor: input.actor,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          details: redactedDetails ?? undefined,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // Fire-and-forget: log error but never throw
      console.error('Audit log write failed', error);
    }
  }

  /**
   * Query audit entries with optional filters.
   *
   * Supports filtering by actor, action, resourceType, and a date
   * range (from / to inclusive).
   */
  async query(filters: AuditQueryFilters): Promise<AuditEntry[]> {
    const where: any = {};

    if (filters.actor) {
      where.actor = filters.actor;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) {
        where.timestamp.gte = filters.from;
      }
      if (filters.to) {
        where.timestamp.lte = filters.to;
      }
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return rows.map((row) => ({
      actor: row.actor,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      details: (row.details as Record<string, unknown>) ?? undefined,
      ip: row.ip ?? undefined,
      userAgent: row.userAgent ?? undefined,
      timestamp: row.timestamp,
    }));
  }
}
