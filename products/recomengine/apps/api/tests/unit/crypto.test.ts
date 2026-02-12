import { describe, it, expect } from '@jest/globals';
import { hashApiKey, generateApiKey, getKeyPrefix, generateResetToken } from '../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('generateApiKey', () => {
    it('should generate a key with rk_live_ prefix for live environment', () => {
      const key = generateApiKey('live');
      expect(key).toMatch(/^rk_live_/);
    });

    it('should generate a key with rk_test_ prefix for test environment', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^rk_test_/);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateApiKey('live');
      const key2 = generateApiKey('live');
      expect(key1).not.toBe(key2);
    });

    it('should generate keys of sufficient length', () => {
      const key = generateApiKey('live');
      expect(key.length).toBeGreaterThan(20);
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent hashes for the same input', () => {
      const key = 'rk_live_test123abc456';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('rk_live_key1');
      const hash2 = hashApiKey('rk_live_key2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string output', () => {
      const hash = hashApiKey('rk_live_test');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('getKeyPrefix', () => {
    it('should return first 12 characters', () => {
      const key = 'rk_live_abc123def456xyz';
      const prefix = getKeyPrefix(key);
      expect(prefix).toBe('rk_live_abc1');
      expect(prefix.length).toBe(12);
    });
  });

  describe('generateResetToken', () => {
    it('should generate a hex token', () => {
      const token = generateResetToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();
      expect(token1).not.toBe(token2);
    });
  });
});
