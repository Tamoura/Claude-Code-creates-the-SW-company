import { Logger, logger, redactSensitiveFields } from '../src/utils/logger';

describe('redactSensitiveFields', () => {
  it('redacts password fields', () => {
    const result = redactSensitiveFields({ password: 'super-secret', name: 'Alice' });
    expect(result.password).toBe('[REDACTED]');
    expect(result.name).toBe('Alice');
  });

  it('redacts token fields', () => {
    const result = redactSensitiveFields({ token: 'jwt-token-value' });
    expect(result.token).toBe('[REDACTED]');
  });

  it('redacts authorization fields', () => {
    const result = redactSensitiveFields({ authorization: 'Bearer xyz' });
    expect(result.authorization).toBe('[REDACTED]');
  });

  it('redacts api_key fields', () => {
    const result = redactSensitiveFields({ api_key: 'sk_live_abc' });
    expect(result.api_key).toBe('[REDACTED]');
  });

  it('recursively redacts nested sensitive fields', () => {
    const result = redactSensitiveFields({
      user: { email: 'user@test.com', password: 'secret' },
    });
    expect((result.user as any).password).toBe('[REDACTED]');
    expect((result.user as any).email).toBe('user@test.com');
  });

  it('preserves non-sensitive fields', () => {
    const result = redactSensitiveFields({ name: 'Alice', age: 30, active: true });
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
    expect(result.active).toBe(true);
  });

  it('preserves arrays as-is', () => {
    const result = redactSensitiveFields({ tags: ['a', 'b', 'c'] });
    expect(result.tags).toEqual(['a', 'b', 'c']);
  });
});

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs info messages', () => {
    const log = new Logger('info');
    log.info('Test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs warn messages', () => {
    const log = new Logger('info');
    log.warn('Warning message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs error messages with error object', () => {
    const log = new Logger('info');
    const err = new Error('Test error');
    log.error('An error occurred', err);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs debug only when level is debug', () => {
    const debugLog = new Logger('debug');
    const infoLog = new Logger('info');

    debugLog.debug('Debug message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockClear();
    infoLog.debug('Debug message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('redacts sensitive data in log output', () => {
    const log = new Logger('info');
    log.info('Login attempt', { password: 'secret123', email: 'user@test.com' });
    const callArg = JSON.stringify(consoleSpy.mock.calls[0]);
    expect(callArg).not.toContain('secret123');
    expect(callArg).toContain('[REDACTED]');
  });
});

describe('default logger instance', () => {
  it('exports a default logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
