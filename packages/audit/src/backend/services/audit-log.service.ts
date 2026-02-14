/**
 * Audit Log Service
 *
 * Provides a dedicated audit trail for security-critical actions.
 *
 * Design:
 * - Database persistence via Prisma
 * - In-memory fallback (10k ring buffer) when Prisma unavailable
 * - Sensitive field redaction (passwords, tokens, secrets, keys)
 * - Fire-and-forget: record() never throws
 * - Queryable by actor, action, resourceType, and date range
 */

import { logger } from '@connectsw/shared';

/** Minimal Prisma client interface for audit logging */
export interface PrismaAuditClient {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      take?: number;
      skip?: number;
    }): Promise<Record<string, unknown>[]>;
  };
}

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
  limit?: number;
  offset?: number;
}

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'key', 'authorization', 'credential', 'apikey'];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

/**
 * Deep-clone a details object, replacing values of sensitive keys with '[REDACTED]'.
 */
function redactDetails(details: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactDetails(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

const MAX_BUFFER_SIZE = 10_000;

export class AuditLogService {
  private entries: AuditEntry[] = [];
  private prisma: PrismaAuditClient | null;

  constructor(prisma?: PrismaAuditClient) {
    this.prisma = prisma ?? null;
  }

  /**
   * Record an audit entry. Never throws.
   *
   * Persists to DB when Prisma available, falls back to in-memory ring buffer.
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
        return this.prisma.auditLog
          .create({
            data: {
              actor: entry.actor,
              action: entry.action,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
              details: redactedDetails,
              ip: entry.ip,
              userAgent: entry.userAgent,
              timestamp: entry.timestamp,
            },
          })
          .then(() => {
            // DB write succeeded — skip in-memory to avoid duplication
          })
          .catch((error: Error) => {
            logger.error('Audit log database write failed', error);
            this.pushBounded(entry);
          });
      }

      this.pushBounded(entry);
    } catch (error) {
      logger.error('Audit log write failed', error);
    }
  }

  private pushBounded(entry: AuditEntry): void {
    if (this.entries.length >= MAX_BUFFER_SIZE) {
      this.entries.shift();
    }
    this.entries.push(entry);
  }

  /**
   * Query audit entries with optional filters.
   * Uses DB when Prisma available, else filters in-memory.
   */
  query(filters: AuditQueryFilters = {}): AuditEntry[] | Promise<AuditEntry[]> {
    if (this.prisma) {
      const where: Record<string, unknown> = {};
      if (filters.actor) where.actor = filters.actor;
      if (filters.action) where.action = filters.action;
      if (filters.resourceType) where.resourceType = filters.resourceType;
      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) where.timestamp.gte = filters.from;
        if (filters.to) where.timestamp.lte = filters.to;
      }

      return this.prisma.auditLog
        .findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit ?? 100,
          skip: filters.offset ?? 0,
        })
        .then((rows: Record<string, unknown>[]) =>
          rows.map((row) => ({
            actor: row.actor,
            action: row.action,
            resourceType: row.resourceType,
            resourceId: row.resourceId,
            details: row.details as Record<string, unknown> | undefined,
            ip: row.ip ?? undefined,
            userAgent: row.userAgent ?? undefined,
            timestamp: row.timestamp,
          })),
        );
    }

    let result = this.entries.filter((entry) => {
      if (filters.actor && entry.actor !== filters.actor) return false;
      if (filters.action && entry.action !== filters.action) return false;
      if (filters.resourceType && entry.resourceType !== filters.resourceType) return false;
      if (filters.from && entry.timestamp < filters.from) return false;
      if (filters.to && entry.timestamp > filters.to) return false;
      return true;
    });

    // Sort descending (newest first) to match DB behavior
    result = result.slice().reverse();

    if (filters.offset) result = result.slice(filters.offset);
    if (filters.limit) result = result.slice(0, filters.limit);

    return result;
  }

  /** Get in-memory entry count (for monitoring). */
  get bufferSize(): number {
    return this.entries.length;
  }
}
