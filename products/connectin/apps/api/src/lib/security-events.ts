import { FastifyBaseLogger } from 'fastify';
import { createHash } from 'crypto';

const LOG_SALT = (() => {
  const salt = process.env.LOG_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    throw new Error('LOG_SALT environment variable is required in production');
  }
  return salt ?? 'connectin-log-salt';
})();

/** Mask email: "user@example.com" → "u***@example.com" */
function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return '***';
  return email[0] + '***' + email.slice(atIdx);
}

/** Hash IP to 16-char hex for pseudonymization */
function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + LOG_SALT)
    .digest('hex')
    .slice(0, 16);
}

export type SecurityEventType =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.login.locked'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.token.refresh'
  | 'auth.token.replay'
  | 'auth.password.reset_requested'
  | 'auth.password.reset_completed'
  | 'auth.email.verified'
  | 'auth.account.deleted'
  | 'auth.account.locked'
  | 'auth.gdpr.processing_restricted'
  | 'auth.gdpr.processing_restriction_lifted'
  | 'auth.gdpr.objection_registered'
  | 'auth.gdpr.objection_withdrawn';

/** Events logged at warn level (suspicious activity). */
const WARN_EVENTS = new Set<SecurityEventType>([
  'auth.token.replay',
]);

export interface SecurityEvent {
  event: SecurityEventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  requestId?: string;
}

export class SecurityEventLogger {
  constructor(private readonly logger: FastifyBaseLogger) {}

  log(input: SecurityEvent): void {
    // Build payload — omit undefined keys for clean log output
    const payload: Record<string, unknown> = {
      msg: 'security',
      event: input.event,
      timestamp: new Date().toISOString(),
    };

    if (input.userId !== undefined) payload.userId = input.userId;
    if (input.email !== undefined) payload.email = maskEmail(input.email);
    if (input.ip !== undefined) payload.ip = hashIp(input.ip);
    if (input.userAgent !== undefined) payload.userAgent = input.userAgent;
    if (input.reason !== undefined) payload.reason = input.reason;
    if (input.requestId !== undefined) payload.requestId = input.requestId;

    if (WARN_EVENTS.has(input.event)) {
      payload.severity = 'high';
      this.logger.warn(payload);
    } else {
      this.logger.info(payload);
    }
  }
}
