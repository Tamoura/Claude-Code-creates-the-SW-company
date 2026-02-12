import { validateEnv, resetValidatedEnv } from '../../src/lib/env';
import { logger } from '../../src/utils/logger';

// Spy on logger.warn to verify warnings
jest.spyOn(logger, 'warn').mockImplementation(() => {});

describe('Environment validation', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    // Reset the cached validated env between tests
    resetValidatedEnv();
    (logger.warn as jest.Mock).mockClear();
  });

  afterAll(() => {
    // Restore original environment
    process.env = savedEnv;
    resetValidatedEnv();
  });

  it('should throw if DATABASE_URL is missing', () => {
    const dbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    expect(() => validateEnv()).toThrow('DATABASE_URL');

    process.env.DATABASE_URL = dbUrl;
  });

  it('should throw if DATABASE_URL is empty', () => {
    const dbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = '';

    expect(() => validateEnv()).toThrow();

    process.env.DATABASE_URL = dbUrl;
  });

  it('should succeed when DATABASE_URL is set', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('should warn when SMTP_HOST is not set', () => {
    delete process.env.SMTP_HOST;
    resetValidatedEnv();
    validateEnv();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SMTP_HOST')
    );
  });

  it('should warn when ALLOWED_ORIGINS uses default', () => {
    delete process.env.ALLOWED_ORIGINS;
    resetValidatedEnv();
    validateEnv();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ALLOWED_ORIGINS')
    );
  });

  it('should not warn when SMTP_HOST is set', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    resetValidatedEnv();
    validateEnv();

    const warnCalls = (logger.warn as jest.Mock).mock.calls;
    const smtpWarnings = warnCalls.filter(
      (call: string[]) => call[0]?.includes?.('SMTP_HOST')
    );
    expect(smtpWarnings.length).toBe(0);

    delete process.env.SMTP_HOST;
  });
});
