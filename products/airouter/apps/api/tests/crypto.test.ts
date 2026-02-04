import './setup';
import {
  hashPassword,
  verifyPassword,
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from '../src/utils/crypto';

describe('Crypto utilities', () => {
  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify a password', async () => {
      const password = 'MySecureP@ssw0rd!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate a key with air_live prefix', () => {
      const key = generateApiKey('air_live');
      expect(key.startsWith('air_live_')).toBe(true);
      expect(key.length).toBeGreaterThan(20);
    });

    it('should generate a key with air_test prefix', () => {
      const key = generateApiKey('air_test');
      expect(key.startsWith('air_test_')).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should hash a key deterministically', () => {
      const key = 'air_live_abc123';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('air_live_key1');
      const hash2 = hashApiKey('air_live_key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getApiKeyPrefix', () => {
    it('should return the first 16 characters with ellipsis', () => {
      const key = 'air_live_abcdefghijklmnopqrstuvwxyz';
      const prefix = getApiKeyPrefix(key);
      expect(prefix).toBe('air_live_abcdefg...');
      expect(prefix.length).toBe(19);
    });
  });
});
