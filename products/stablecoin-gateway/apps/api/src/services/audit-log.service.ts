/**
 * Audit Log Service
 *
 * Provides a dedicated audit trail for security-critical
 * administrative actions such as API key management, webhook
 * modifications, refund processing, and authentication events.
 *
 * Design:
 * - Database persistence via Prisma (Audit Issue #3 fix)
 * - In-memory fallback when no Prisma client is provided
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
  private entries: AuditEntry[] = [];
  private prisma: PrismaClient | null;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? null;
  }

  /**
   * Record an audit entry.
   *
   * When a Prisma client is available, persists to the database.
   * Falls back to in-memory storage otherwise.
   *
   * This method is intentionally fire-and-forget: it will never
   * throw an exception so that audit logging failures do not block
   * the main operation being audited.
   */
  record(input: AuditRecordInput): void | Promise<void> {
    try {
      const redactedDetails = input.details ? redactDetails(input.details) : undefined;
      const entry: AuditEntry = {
        ...input,
        details: redactedDetails,
        timestamp: new Date(),
      };

      if (this.prisma) {
        return this.prisma.auditLog.create({
          data: {
            actor: entry.actor,
            action: entry.action,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            details: redactedDetails as any,
            ip: entry.ip,
            userAgent: entry.userAgent,
            timestamp: entry.timestamp,
          },
        }).then(() => {
          // Also store in memory for fast recent queries
          this.entries.push(entry);
        }).catch((error) => {
          console.error('Audit log write failed', error);
        });
      }

      this.entries.push(entry);
    } catch (error) {
      console.error('Audit log write failed', error);
    }
  }

  /**
   * Query audit entries with optional filters.
   *
   * When a Prisma client is available, queries the database.
   * Falls back to in-memory filtering otherwise.
   */
  query(filters: AuditQueryFilters): AuditEntry[] | Promise<AuditEntry[]> {
    if (this.prisma) {
      const where: any = {};
      if (filters.actor) where.actor = filters.actor;
      if (filters.action) where.action = filters.action;
      if (filters.resourceType) where.resourceType = filters.resourceType;
      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) where.timestamp.gte = filters.from;
        if (filters.to) where.timestamp.lte = filters.to;
      }

      return this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      }).then((rows) =>
        rows.map((row) => ({
          actor: row.actor,
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          details: row.details as Record<string, unknown> | undefined,
          ip: row.ip ?? undefined,
          userAgent: row.userAgent ?? undefined,
          timestamp: row.timestamp,
        }))
      );
    }

    return this.entries.filter((entry) => {
      if (filters.actor && entry.actor !== filters.actor) {
        return false;
      }
      if (filters.action && entry.action !== filters.action) {
        return false;
      }
      if (filters.resourceType && entry.resourceType !== filters.resourceType) {
        return false;
      }
      if (filters.from && entry.timestamp < filters.from) {
        return false;
      }
      if (filters.to && entry.timestamp > filters.to) {
        return false;
      }
      return true;
    });
  }
}
