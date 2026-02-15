import { resetValidatedEnv, validateEnv } from '../src/lib/env';

describe('Environment validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Restore original env and clear the cached validation
    process.env = { ...originalEnv };
    resetValidatedEnv();
  });

  afterAll(() => {
    // Restore for other test suites
    process.env = originalEnv;
    resetValidatedEnv();
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    resetValidatedEnv();

    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('throws when OPENROUTER_API_KEY is missing', () => {
    delete process.env.OPENROUTER_API_KEY;
    resetValidatedEnv();

    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('succeeds with valid environment', () => {
    process.env.DATABASE_URL =
      'postgresql://tamer@localhost:5432/linkedin_agent_dev';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    resetValidatedEnv();

    const env = validateEnv();
    expect(env.DATABASE_URL).toBe(
      'postgresql://tamer@localhost:5432/linkedin_agent_dev'
    );
    expect(env.OPENROUTER_API_KEY).toBe('test-key');
    expect(env.NODE_ENV).toBe('test');
  });

  it('uses defaults for optional fields', () => {
    process.env.DATABASE_URL =
      'postgresql://tamer@localhost:5432/linkedin_agent_dev';
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetValidatedEnv();

    const env = validateEnv();
    expect(env.PORT).toBe('5010');
    expect(env.OPENROUTER_BASE_URL).toBe('https://openrouter.ai/api/v1');
    expect(env.FRONTEND_URL).toBe('http://localhost:3114');
  });

  it('caches the result and returns the same object', () => {
    process.env.DATABASE_URL =
      'postgresql://tamer@localhost:5432/linkedin_agent_dev';
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetValidatedEnv();

    const first = validateEnv();
    const second = validateEnv();
    expect(first).toBe(second); // same reference
  });

  it('resetValidatedEnv clears the cache', () => {
    process.env.DATABASE_URL =
      'postgresql://tamer@localhost:5432/linkedin_agent_dev';
    process.env.OPENROUTER_API_KEY = 'test-key';
    resetValidatedEnv();

    const first = validateEnv();
    resetValidatedEnv();
    const second = validateEnv();
    expect(first).not.toBe(second); // different reference
    expect(first).toEqual(second);  // same values
  });
});
