/**
 * Encryption Key Validation Tests
 *
 * Tests for WEBHOOK_ENCRYPTION_KEY validation in initializeEncryption():
 * - Valid 64 hex character key passes
 * - Short keys (32 chars) fail
 * - Non-hex characters fail
 * - Keys with 63 and 65 characters fail
 */

describe('Encryption Key Validation', () => {
  const originalEnv = process.env.WEBHOOK_ENCRYPTION_KEY;

  // Valid 64 hex character key (generated with: openssl rand -hex 32)
  const validKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  beforeEach(() => {
    // Clear module cache to allow re-initialization
    jest.resetModules();
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.WEBHOOK_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    }
  });

  describe('Valid key acceptance', () => {
    it('should accept a valid 64 hex character key', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = validKey;

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).not.toThrow();
    });

    it('should accept lowercase hex characters', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).not.toThrow();
    });

    it('should accept uppercase hex characters', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).not.toThrow();
    });

    it('should accept mixed case hex characters', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'AbCdEf0123456789aBcDeF0123456789AbCdEf0123456789aBcDeF0123456789';

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).not.toThrow();
    });
  });

  describe('Key length validation', () => {
    it('should reject a 32 character key (old requirement)', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'; // 32 chars

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject a 63 character key (one too short)', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b'; // 63 chars

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject a 65 character key (one too long)', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c'; // 65 chars

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject an empty key', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = '';

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY environment variable is required'
      );
    });
  });

  describe('Hex format validation', () => {
    it('should reject non-hex characters (letter g)', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'g1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'; // 'g' is not hex

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject special characters', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6-7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'; // contains '-'

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject spaces in key', () => {
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8 c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b'; // contains space

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });

    it('should reject alphanumeric but non-hex key', () => {
      // This key has valid length but contains 'z' which is not hex
      process.env.WEBHOOK_ENCRYPTION_KEY = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)'
      );
    });
  });

  describe('Missing key validation', () => {
    it('should reject undefined key', () => {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;

      const { initializeEncryption } = require('../../src/utils/encryption');

      expect(() => initializeEncryption()).toThrow(
        'WEBHOOK_ENCRYPTION_KEY environment variable is required'
      );
    });
  });
});
