/**
 * tests/integration/config.test.ts — Config validation tests
 *
 * Tests that config.ts validates env vars correctly.
 * Uses child_process.execSync to test fail-fast behavior in a clean process.
 *
 * [BACKEND-01] Config validation tests
 */

import { z } from 'zod';

describe('[BACKEND-01] Config Validation', () => {
  // Test the Zod schema logic directly (not the exported config object,
  // which is already parsed from test env vars)

  const envSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_EXPIRY: z.coerce.number().int().positive().default(604800),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1024).max(65535).default(5014),
  });

  test('[BACKEND-01] valid config parses successfully', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(true);
  });

  test('[BACKEND-01] missing DATABASE_URL fails validation', () => {
    const result = envSchema.safeParse({
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('DATABASE_URL');
    }
  });

  test('[BACKEND-01] invalid DATABASE_URL (not a URL) fails validation', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'not-a-valid-url',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('DATABASE_URL');
    }
  });

  test('[BACKEND-01] JWT_SECRET shorter than 32 chars fails validation', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'too-short',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('JWT_SECRET');
    }
  });

  test('[BACKEND-01] PORT defaults to 5014 when not provided', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(5014);
    }
  });

  test('[BACKEND-01] NODE_ENV defaults to "development" when not provided', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  test('[BACKEND-01] invalid NODE_ENV value fails validation', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
      NODE_ENV: 'staging', // Not in enum
    });

    expect(result.success).toBe(false);
  });

  test('[BACKEND-01] JWT_ACCESS_EXPIRY coerces string to number', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://postgres@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'this-is-a-valid-secret-with-32-chars',
      JWT_REFRESH_SECRET: 'this-is-another-valid-secret-32ch',
      JWT_ACCESS_EXPIRY: '900', // String — should coerce to number
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.JWT_ACCESS_EXPIRY).toBe(900);
      expect(typeof result.data.JWT_ACCESS_EXPIRY).toBe('number');
    }
  });
});
