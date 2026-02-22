import {
  SecurityEventLogger,
  SecurityEventType,
} from '../src/lib/security-events';

// Create a mock Pino-style logger
function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(),
    level: 'info',
    silent: jest.fn(),
  };
}

describe('SecurityEventLogger', () => {
  let logger: ReturnType<typeof createMockLogger>;
  let secLog: SecurityEventLogger;

  beforeEach(() => {
    logger = createMockLogger();
    secLog = new SecurityEventLogger(logger as any);
  });

  it('logs a login success event with correct structure', () => {
    secLog.log({
      event: 'auth.login.success',
      userId: 'u-1',
      ip: '127.0.0.1',
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const call = logger.info.mock.calls[0][0];
    expect(call.msg).toBe('security');
    expect(call.event).toBe('auth.login.success');
    expect(call.userId).toBe('u-1');
    // IP is hashed (16-char hex), not plaintext
    expect(call.ip).toMatch(/^[0-9a-f]{16}$/);
    expect(call.timestamp).toBeDefined();
  });

  it('masks email addresses in log output', () => {
    secLog.log({
      event: 'auth.login.failed',
      email: 'bad@example.com',
      ip: '10.0.0.1',
      reason: 'invalid_password',
    });

    const call = logger.info.mock.calls[0][0];
    expect(call.event).toBe('auth.login.failed');
    // Email must be masked: first char + *** + @domain
    expect(call.email).toBe('b***@example.com');
    expect(call.email).not.toBe('bad@example.com');
    expect(call.reason).toBe('invalid_password');
  });

  it('hashes IP addresses in log output', () => {
    secLog.log({
      event: 'auth.login.success',
      userId: 'u-1',
      ip: '192.168.1.100',
    });

    const call = logger.info.mock.calls[0][0];
    // IP must be hashed (16-char hex string), not plaintext
    expect(call.ip).not.toBe('192.168.1.100');
    expect(call.ip).toMatch(/^[0-9a-f]{16}$/);
  });

  it('logs account locked event', () => {
    secLog.log({
      event: 'auth.account.locked',
      userId: 'u-2',
      reason: 'max_failed_attempts',
    });

    const call = logger.info.mock.calls[0][0];
    expect(call.event).toBe('auth.account.locked');
    expect(call.reason).toBe('max_failed_attempts');
  });

  it('logs token replay attempt as warn', () => {
    secLog.log({
      event: 'auth.token.replay',
      ip: '192.168.1.1',
      reason: 'blacklisted_refresh_token',
    });

    // Token replay should be logged at warn level (suspicious activity)
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const call = logger.warn.mock.calls[0][0];
    expect(call.event).toBe('auth.token.replay');
    expect(call.severity).toBe('high');
  });

  it('logs all supported event types', () => {
    const eventTypes: SecurityEventType[] = [
      'auth.login.success',
      'auth.login.failed',
      'auth.login.locked',
      'auth.register',
      'auth.logout',
      'auth.token.refresh',
      'auth.token.replay',
      'auth.password.reset_requested',
      'auth.password.reset_completed',
      'auth.email.verified',
      'auth.account.deleted',
      'auth.account.locked',
    ];

    for (const event of eventTypes) {
      secLog.log({ event });
    }

    // All events should be logged (some at info, token.replay at warn)
    const totalCalls =
      logger.info.mock.calls.length + logger.warn.mock.calls.length;
    expect(totalCalls).toBe(eventTypes.length);
  });

  it('includes requestId when provided', () => {
    secLog.log({
      event: 'auth.login.success',
      userId: 'u-1',
      requestId: 'req-abc-123',
    });

    const call = logger.info.mock.calls[0][0];
    expect(call.requestId).toBe('req-abc-123');
  });

  it('omits undefined optional fields from log output', () => {
    secLog.log({ event: 'auth.logout' });

    const call = logger.info.mock.calls[0][0];
    expect(call).not.toHaveProperty('userId');
    expect(call).not.toHaveProperty('email');
    expect(call).not.toHaveProperty('ip');
  });
});
