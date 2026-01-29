/**
 * Encryption Utility Tests
 *
 * Tests for AES-256-GCM encryption used for webhook secrets at rest:
 * - Encryption and decryption
 * - Key derivation from environment variable
 * - Error handling for missing keys
 * - Tampering detection
 */

import { encryptSecret, decryptSecret, initializeEncryption } from '../../src/utils/encryption';

describe('Encryption Utility - AES-256-GCM', () => {
  const originalEnv = process.env.WEBHOOK_ENCRYPTION_KEY;

  beforeAll(() => {
    // Set encryption key for tests (64 hex chars = 32 bytes for AES-256)
    process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    initializeEncryption();
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.WEBHOOK_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    }
  });

  describe('Basic encryption and decryption', () => {
    it('should encrypt and decrypt a secret successfully', () => {
      const plaintext = 'whsec_1234567890abcdef1234567890abcdef';

      const encrypted = encryptSecret(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'whsec_secret123';

      const encrypted1 = encryptSecret(plaintext);
      const encrypted2 = encryptSecret(plaintext);

      // Different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same plaintext
      expect(decryptSecret(encrypted1)).toBe(plaintext);
      expect(decryptSecret(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';

      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const plaintext = 'secret™️🔐💯 with special chars!@#$%^&*()';

      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long secrets', () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Tampering detection', () => {
    it('should throw error if ciphertext is tampered', () => {
      const plaintext = 'whsec_secret123';
      const encrypted = encryptSecret(plaintext);

      // Tamper with ciphertext by changing a character
      const tampered = encrypted.slice(0, -1) + 'X';

      expect(() => decryptSecret(tampered)).toThrow();
    });

    it('should throw error if IV is tampered', () => {
      const plaintext = 'whsec_secret123';
      const encrypted = encryptSecret(plaintext);

      // Encrypted format is: iv:authTag:ciphertext (all base64)
      const parts = encrypted.split(':');
      const tamperedIv = 'AAAA' + parts[0].slice(4);
      const tampered = [tamperedIv, parts[1], parts[2]].join(':');

      expect(() => decryptSecret(tampered)).toThrow();
    });

    it('should throw error if auth tag is tampered', () => {
      const plaintext = 'whsec_secret123';
      const encrypted = encryptSecret(plaintext);

      const parts = encrypted.split(':');
      const tamperedTag = 'AAAA' + parts[1].slice(4);
      const tampered = [parts[0], tamperedTag, parts[2]].join(':');

      expect(() => decryptSecret(tampered)).toThrow();
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid ciphertext format', () => {
      // Wrong number of parts
      expect(() => decryptSecret('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decryptSecret('only:two')).toThrow('Invalid encrypted data format');
      expect(() => decryptSecret('too:many:parts:here')).toThrow('Invalid encrypted data format');
    });

    it('should throw error for non-base64 data', () => {
      expect(() => decryptSecret('!!!:???:###')).toThrow();
    });
  });

  describe('Key management', () => {
    it('should throw error if encryption key is not set', () => {
      const tempKey = process.env.WEBHOOK_ENCRYPTION_KEY;
      delete process.env.WEBHOOK_ENCRYPTION_KEY;

      expect(() => {
        // Re-initialize without key
        const { initializeEncryption: reinit } = require('../../src/utils/encryption');
        reinit();
      }).toThrow('WEBHOOK_ENCRYPTION_KEY environment variable is required');

      // Restore key
      process.env.WEBHOOK_ENCRYPTION_KEY = tempKey;
    });

    it('should require exactly 64 hex characters', () => {
      const shortKey = 'short';
      process.env.WEBHOOK_ENCRYPTION_KEY = shortKey;

      expect(() => {
        const { initializeEncryption: reinit } = require('../../src/utils/encryption');
        reinit();
      }).toThrow('WEBHOOK_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256)');

      // Restore proper key (64 hex chars)
      process.env.WEBHOOK_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
    });
  });

  describe('Format validation', () => {
    it('should produce encrypted data in correct format', () => {
      const encrypted = encryptSecret('test');

      // Format should be: iv:authTag:ciphertext
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // Each part should be valid base64
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });
    });

    it('should use proper IV length (12 bytes for GCM)', () => {
      const encrypted = encryptSecret('test');
      const [ivBase64] = encrypted.split(':');

      // 12 bytes = 16 base64 characters
      const iv = Buffer.from(ivBase64, 'base64');
      expect(iv.length).toBe(12);
    });

    it('should use proper auth tag length (16 bytes for GCM)', () => {
      const encrypted = encryptSecret('test');
      const [, authTagBase64] = encrypted.split(':');

      // 16 bytes auth tag
      const authTag = Buffer.from(authTagBase64, 'base64');
      expect(authTag.length).toBe(16);
    });
  });
});
