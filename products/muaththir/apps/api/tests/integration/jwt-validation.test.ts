import { buildApp } from '../../src/app';

describe('JWT_SECRET validation', () => {
  const originalEnv = process.env.JWT_SECRET;

  afterEach(() => {
    // Restore original value
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  it('should throw if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;

    await expect(buildApp({ logger: false })).rejects.toThrow(
      'JWT_SECRET environment variable is required and must be at least 32 characters'
    );
  });

  it('should throw if JWT_SECRET is empty string', async () => {
    process.env.JWT_SECRET = '';

    await expect(buildApp({ logger: false })).rejects.toThrow(
      'JWT_SECRET environment variable is required and must be at least 32 characters'
    );
  });

  it('should throw if JWT_SECRET is less than 32 characters', async () => {
    process.env.JWT_SECRET = 'short-secret-only-30-chars-aa';

    await expect(buildApp({ logger: false })).rejects.toThrow(
      'JWT_SECRET environment variable is required and must be at least 32 characters'
    );
  });

  it('should accept JWT_SECRET with exactly 32 characters', async () => {
    process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz123456';

    const app = await buildApp({ logger: false });
    expect(app).toBeDefined();
    await app.close();
  });

  it('should accept JWT_SECRET longer than 32 characters', async () => {
    process.env.JWT_SECRET = 'this-is-a-very-long-secret-key-that-is-well-over-32-characters';

    const app = await buildApp({ logger: false });
    expect(app).toBeDefined();
    await app.close();
  });
});
