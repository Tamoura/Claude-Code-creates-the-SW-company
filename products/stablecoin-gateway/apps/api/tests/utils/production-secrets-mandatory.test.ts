/**
 * Production Secrets Mandatory Tests
 *
 * Audit Issue #8: Missing encryption keys only produce warnings,
 * not startup errors in production mode.
 *
 * These tests verify that API_KEY_HMAC_SECRET causes a startup
 * failure (process.exit) when missing in production.
 */

import { validateEnvironment } from '../../src/utils/env-validator';

describe('Production secrets enforcement', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Start with a clean env -- only set what setBaseEnv provides
    process.env = {};
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Helper: set minimal valid env so only the variable under test triggers failure.
   * Must set every required variable (including production-only requirements)
   * to avoid cascading errors.
   */
  function setBaseEnv() {
    process.env.JWT_SECRET = '4f8a1c3e5b7d9f2a6e0c8b4d7f1a3e5b9d2c6f0a8e4b7d1f3a5c9e2b6d0f8aab';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
    process.env.KMS_KEY_ID = 'arn:aws:kms:us-east-1:123456789012:key/test-key-id';
    process.env.AWS_REGION = 'us-east-1';
    process.env.WEBHOOK_ENCRYPTION_KEY = '4f8a1c3e5b7d9f2a6e0c8b4d7f1a3e5b9d2c6f0a8e4b7d1f3a5c9e2b6d0f8aab';
    process.env.INTERNAL_API_KEY = '7b2e9f4a1d8c5e3b6f0a2d7c4e9b1f5a3d8c6e0b4f7a2d9c5e1b3f8a6d0c4e7';
    process.env.FRONTEND_URL = 'https://app.stableflow.io';
  }

  it('should throw in production when API_KEY_HMAC_SECRET is missing', () => {
    setBaseEnv();
    process.env.NODE_ENV = 'production';
    // API_KEY_HMAC_SECRET intentionally NOT set

    expect(() => validateEnvironment()).toThrow('Environment validation failed');
  });

  it('should NOT throw in development when API_KEY_HMAC_SECRET is missing', () => {
    setBaseEnv();
    process.env.NODE_ENV = 'development';
    // API_KEY_HMAC_SECRET intentionally NOT set

    expect(() => validateEnvironment()).not.toThrow();
  });

  it('should NOT throw in production when API_KEY_HMAC_SECRET is present', () => {
    setBaseEnv();
    process.env.NODE_ENV = 'production';
    process.env.API_KEY_HMAC_SECRET = '7b2e9f4a1d8c5e3b6f0a2d7c4e9b1f5a3d8c6e0b4f7a2d9c5e1b3f8a6d0c4e7';

    expect(() => validateEnvironment()).not.toThrow();
  });
});
