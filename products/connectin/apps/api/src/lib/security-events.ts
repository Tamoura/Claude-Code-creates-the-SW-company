import { FastifyBaseLogger } from 'fastify';

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
  | 'auth.account.locked';

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
    if (input.email !== undefined) payload.email = input.email;
    if (input.ip !== undefined) payload.ip = input.ip;
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
