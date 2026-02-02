import { validateEnvironment } from '../../src/utils/env-validator';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('JWT_SECRET validation', () => {
    it('should throw when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should throw when JWT_SECRET is too short (<32 chars)', () => {
      process.env.JWT_SECRET = 'short-secret-12345';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should throw when JWT_SECRET is the default value', () => {
      process.env.JWT_SECRET = 'change-this-secret-in-production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should pass validation with valid JWT_SECRET (32+ chars)', () => {
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-with-more-than-32-characters';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should pass validation with exactly 32 character JWT_SECRET', () => {
      process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz123456'; // Exactly 32 chars
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('DATABASE_URL validation', () => {
    it('should throw when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-with-more-than-32-characters';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should pass validation with valid DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-with-more-than-32-characters';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('Optional environment variables', () => {
    it('should pass validation when optional variables are missing', () => {
      process.env.JWT_SECRET = 'this-is-a-very-secure-secret-key-with-more-than-32-characters';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      process.env.ALLOW_PRIVATE_KEY_FALLBACK = 'true';
      process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      delete process.env.PORT;
      delete process.env.FRONTEND_URL;

      expect(() => validateEnvironment()).not.toThrow();
    });
  });
});
