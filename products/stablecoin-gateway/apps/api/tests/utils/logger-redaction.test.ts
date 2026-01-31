import { logger } from '../../src/utils/logger.js';

describe('Logger PII redaction', () => {
  let logOutput: string[];
  const originalLog = console.log;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    logOutput = [];
    // Use production mode so the logger outputs JSON.stringify
    process.env.NODE_ENV = 'production';
    console.log = (...args: unknown[]) => {
      logOutput.push(
        args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      );
    };
  });

  afterEach(() => {
    console.log = originalLog;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should redact password key', () => {
    logger.info('test', { password: 'secret123' });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('secret123');
  });

  it('should redact keys containing "token"', () => {
    logger.info('test', { accessToken: 'eyJhbGciOiJIUz' });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('eyJhbGciOiJIUz');
  });

  it('should redact keys containing "secret"', () => {
    logger.info('test', { webhookSecret: 'whsec_abc123' });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('whsec_abc123');
  });

  it('should redact keys containing "key"', () => {
    logger.info('test', { apiKey: 'sk_test_123' });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('sk_test_123');
  });

  it('should redact keys containing "authorization"', () => {
    logger.info('test', { authorization: 'Bearer xyz' });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('Bearer xyz');
  });

  it('should redact nested sensitive keys recursively', () => {
    logger.info('test', {
      user: { email: 'ok@test.com', password: 'hidden' },
    });
    expect(logOutput[0]).toContain('[REDACTED]');
    expect(logOutput[0]).not.toContain('hidden');
    expect(logOutput[0]).toContain('ok@test.com');
  });

  it('should preserve non-sensitive keys', () => {
    logger.info('test', { userId: '123', email: 'test@example.com' });
    expect(logOutput[0]).toContain('123');
    expect(logOutput[0]).toContain('test@example.com');
    expect(logOutput[0]).not.toContain('[REDACTED]');
  });

  it('should match case-insensitively', () => {
    logger.info('test', { Password: 'abc', SECRET_KEY: 'def' });
    expect(logOutput[0]).not.toContain('abc');
    expect(logOutput[0]).not.toContain('def');
  });
});
