import { loadConfig, resetConfig } from '../../src/config';

describe('Config validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfig();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/connectgrc_test';
    process.env.JWT_SECRET = 'test-secret-for-jwt-signing-minimum-32-chars';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
    resetConfig();
  });

  it('loads valid config from environment', () => {
    const config = loadConfig();

    expect(config.DATABASE_URL).toBe('postgresql://postgres@localhost:5432/connectgrc_test');
    expect(config.PORT).toBe(5006);
    expect(config.NODE_ENV).toBe('test');
  });

  it('uses default port 5006', () => {
    delete process.env.PORT;
    const config = loadConfig();
    expect(config.PORT).toBe(5006);
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });

  it('throws when JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => loadConfig()).toThrow('Invalid environment configuration');
  });

  it('accepts valid JWT_SECRET', () => {
    process.env.JWT_SECRET = 'a-valid-secret-that-is-at-least-32-characters-long';
    const config = loadConfig();
    expect(config.JWT_SECRET).toBe('a-valid-secret-that-is-at-least-32-characters-long');
  });

  it('uses default rate limit values', () => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW;
    const config = loadConfig();
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.RATE_LIMIT_WINDOW).toBe(60000);
  });
});
