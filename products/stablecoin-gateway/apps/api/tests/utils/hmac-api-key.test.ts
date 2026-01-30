/**
 * HMAC API Key Hashing Tests
 *
 * Validates that hashApiKey uses HMAC-SHA-256 when API_KEY_HMAC_SECRET
 * is set, and falls back to plain SHA-256 when the secret is absent.
 */

import * as crypto from 'crypto';

describe('hashApiKey HMAC-SHA-256', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEY_HMAC_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('with HMAC secret set', () => {
    const hmacSecret = 'test-hmac-secret-for-api-key-hashing';
    const testApiKey = 'sk_live_abc123def456';

    it('should produce a different hash than plain SHA-256', () => {
      process.env.API_KEY_HMAC_SECRET = hmacSecret;

      const { hashApiKey } = require('../../src/utils/crypto');

      const hmacHash = hashApiKey(testApiKey);
      const plainHash = crypto
        .createHash('sha256')
        .update(testApiKey)
        .digest('hex');

      expect(hmacHash).not.toEqual(plainHash);
    });

    it('should produce the expected HMAC-SHA-256 hash', () => {
      process.env.API_KEY_HMAC_SECRET = hmacSecret;

      const { hashApiKey } = require('../../src/utils/crypto');

      const expectedHash = crypto
        .createHmac('sha256', hmacSecret)
        .update(testApiKey)
        .digest('hex');

      expect(hashApiKey(testApiKey)).toEqual(expectedHash);
    });
  });

  describe('without HMAC secret', () => {
    const testApiKey = 'sk_live_xyz789';

    it('should fall back to plain SHA-256', () => {
      delete process.env.API_KEY_HMAC_SECRET;

      const { hashApiKey } = require('../../src/utils/crypto');

      const expectedPlainHash = crypto
        .createHash('sha256')
        .update(testApiKey)
        .digest('hex');

      expect(hashApiKey(testApiKey)).toEqual(expectedPlainHash);
    });
  });

  describe('deterministic behavior', () => {
    const hmacSecret = 'deterministic-test-secret';
    const testApiKey = 'sk_live_deterministic_test';

    it('should produce the same hash for the same key and secret', () => {
      process.env.API_KEY_HMAC_SECRET = hmacSecret;

      const { hashApiKey } = require('../../src/utils/crypto');

      const hash1 = hashApiKey(testApiKey);
      const hash2 = hashApiKey(testApiKey);

      expect(hash1).toEqual(hash2);
    });
  });

  describe('different secrets', () => {
    const testApiKey = 'sk_live_same_key_different_secrets';

    it('should produce different hashes with different secrets', () => {
      process.env.API_KEY_HMAC_SECRET = 'secret-alpha';
      const { hashApiKey: hashWithAlpha } = require('../../src/utils/crypto');
      const hashAlpha = hashWithAlpha(testApiKey);

      jest.resetModules();

      process.env.API_KEY_HMAC_SECRET = 'secret-beta';
      const { hashApiKey: hashWithBeta } = require('../../src/utils/crypto');
      const hashBeta = hashWithBeta(testApiKey);

      expect(hashAlpha).not.toEqual(hashBeta);
    });
  });

  describe('output format', () => {
    it('should return a 64-character hex string with HMAC secret', () => {
      process.env.API_KEY_HMAC_SECRET = 'format-test-secret';

      const { hashApiKey } = require('../../src/utils/crypto');

      const hash = hashApiKey('sk_live_format_test');

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return a 64-character hex string without HMAC secret', () => {
      delete process.env.API_KEY_HMAC_SECRET;

      const { hashApiKey } = require('../../src/utils/crypto');

      const hash = hashApiKey('sk_live_format_test');

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('production warning', () => {
    it('should log a warning in production when HMAC secret is missing', () => {
      delete process.env.API_KEY_HMAC_SECRET;
      process.env.NODE_ENV = 'production';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { hashApiKey } = require('../../src/utils/crypto');
      hashApiKey('sk_live_prod_warn_test');

      expect(warnSpy).toHaveBeenCalledWith(
        'WARNING: API_KEY_HMAC_SECRET not set in production - using unsalted SHA-256'
      );

      warnSpy.mockRestore();
    });

    it('should not log a warning in non-production without HMAC secret', () => {
      delete process.env.API_KEY_HMAC_SECRET;
      process.env.NODE_ENV = 'test';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { hashApiKey } = require('../../src/utils/crypto');
      hashApiKey('sk_live_no_warn_test');

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
