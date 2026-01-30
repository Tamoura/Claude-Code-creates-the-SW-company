/**
 * Audit Log Service
 *
 * Provides a dedicated audit trail for security-critical
 * administrative actions such as API key management, webhook
 * modifications, refund processing, and authentication events.
 *
 * Design:
 * - In-memory store for now (database table in a follow-up task)
 * - Sensitive field redaction (passwords, tokens, secrets)
 * - Fire-and-forget: record() never throws
 * - Queryable by actor, action, resourceType, and date range
 *
 * SEC-011: Dedicated audit logging for administrative actions
 */

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

  /**
   * Record an audit entry.
   *
   * This method is intentionally fire-and-forget: it will never
   * throw an exception so that audit logging failures do not block
   * the main operation being audited.
   */
  record(input: AuditRecordInput): void {
    try {
      const entry: AuditEntry = {
        ...input,
        details: input.details ? redactDetails(input.details) : undefined,
        timestamp: new Date(),
      };

      this.entries.push(entry);
    } catch (error) {
      console.error('Audit log write failed', error);
    }
  }

  /**
   * Query audit entries with optional filters.
   *
   * Supports filtering by actor, action, resourceType, and a date
   * range (from / to inclusive).
   */
  query(filters: AuditQueryFilters): AuditEntry[] {
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
