import { calculateShannonEntropy } from '../../src/utils/env-validator';
import { validateEnvironment } from '../../src/utils/env-validator';
import crypto from 'crypto';

describe('JWT Secret Entropy Validation', () => {
  const originalEnv = process.env;

  // Helper: valid base env for development (no KMS/webhook issues)
  function setBaseEnv() {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
    process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
    process.env.HOT_WALLET_PRIVATE_KEY =
      '0x1234567890123456789012345678901234567890123456789012345678901234';
  }

  // Helper: valid base env for production (KMS + webhook configured)
  function setProductionBaseEnv() {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
    process.env.KMS_KEY_ID = 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012';
    process.env.WEBHOOK_ENCRYPTION_KEY = 'a'.repeat(64);
    // Remove private key fallback for production
    delete process.env.HOT_WALLET_PRIVATE_KEY;
    delete process.env.ALLOW_PRIVATE_KEY_FALLBACK;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('calculateShannonEntropy', () => {
    it('should return high entropy for a random hex string', () => {
      const secret = crypto.randomBytes(32).toString('hex');
      const entropy = calculateShannonEntropy(secret);
      // A random hex string should have entropy close to 4.0 bits/char
      expect(entropy).toBeGreaterThan(3.0);
    });

    it('should return zero entropy for a single repeated character', () => {
      const entropy = calculateShannonEntropy('aaaaaaaaaa');
      expect(entropy).toBe(0);
    });

    it('should return exactly 1.0 for a two-character even split', () => {
      // "abababab" = 4 a's and 4 b's out of 8 chars
      const entropy = calculateShannonEntropy('abababab');
      expect(entropy).toBeCloseTo(1.0, 5);
    });

    it('should calculate correct entropy for known input', () => {
      // "aabb" = 2 a's, 2 b's out of 4 chars
      // H = -2*(2/4 * log2(2/4)) = -2*(0.5 * -1) = 1.0
      const entropy = calculateShannonEntropy('aabb');
      expect(entropy).toBeCloseTo(1.0, 5);
    });

    it('should handle an empty string without error', () => {
      const entropy = calculateShannonEntropy('');
      expect(entropy).toBe(0);
    });
  });

  describe('JWT_SECRET entropy in validateEnvironment', () => {
    it('should pass validation with a high-entropy secret', () => {
      setBaseEnv();
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject a repeated-character secret in production', () => {
      setProductionBaseEnv();
      process.env.JWT_SECRET = 'a'.repeat(64);

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should warn but not exit for a repeated-character secret in development', () => {
      setBaseEnv();
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'a'.repeat(64);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject a short dictionary word repeated to meet length', () => {
      setProductionBaseEnv();
      // "password" repeated 8 times = 64 chars, only 7 unique chars
      process.env.JWT_SECRET = 'password'.repeat(8);

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should reject a secret with fewer than 16 unique characters in production', () => {
      setProductionBaseEnv();
      // Use only characters a-o (15 unique) repeated to fill 64 chars
      const fifteenUnique = 'abcdefghijklmno';
      process.env.JWT_SECRET = fifteenUnique.repeat(5).slice(0, 64);

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should warn for fewer than 16 unique characters in development', () => {
      setBaseEnv();
      process.env.NODE_ENV = 'development';
      const fifteenUnique = 'abcdefghijklmno';
      process.env.JWT_SECRET = fifteenUnique.repeat(5).slice(0, 64);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should pass a secret with exactly 16 unique characters and sufficient entropy', () => {
      setProductionBaseEnv();
      // 16 hex characters (0-9, a-f) repeated = 16 unique chars
      const sixteenUnique = '0123456789abcdef';
      process.env.JWT_SECRET = sixteenUnique.repeat(4); // 64 chars

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should use Shannon entropy calculation (entropy >= 3.0 required)', () => {
      // Verify the threshold is based on Shannon entropy
      const highEntropySecret = crypto.randomBytes(32).toString('hex');
      const entropy = calculateShannonEntropy(highEntropySecret);
      expect(entropy).toBeGreaterThanOrEqual(3.0);

      const lowEntropySecret = 'a'.repeat(64);
      const lowEntropy = calculateShannonEntropy(lowEntropySecret);
      expect(lowEntropy).toBeLessThan(3.0);
    });
  });
});
