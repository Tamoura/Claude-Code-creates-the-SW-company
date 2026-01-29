/**
 * KMS Signer Service Tests
 *
 * Tests the SignerProvider abstraction that routes between:
 * - KMSSignerProvider (production: uses AWS KMS)
 * - EnvVarSignerProvider (development only: uses raw private key)
 *
 * Security requirements tested:
 * - Production mode requires KMS (no raw key allowed)
 * - Dev mode warns but allows env var fallback
 * - Private key is never logged
 * - Factory creates correct provider based on USE_KMS
 */

import {
  createSignerProvider,
  KMSSignerProvider,
  EnvVarSignerProvider,
  SignerProvider,
} from '../../src/services/kms-signer.service';

// Mock the logger to capture log output
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock KMS service - conditionally throws when no key ID is configured
jest.mock('../../src/services/kms.service', () => ({
  KMSService: jest.fn().mockImplementation(() => ({
    getAddress: jest.fn().mockResolvedValue('0xKMSAddress'),
    signTransaction: jest.fn().mockResolvedValue('0xSignedTx'),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', message: 'OK' }),
  })),
  createKMSService: jest.fn().mockImplementation(() => {
    const keyId = process.env.KMS_KEY_ID || process.env.AWS_KMS_KEY_ID;
    if (!keyId) {
      throw new Error('KMS_KEY_ID environment variable is required');
    }
    return {
      getAddress: jest.fn().mockResolvedValue('0xKMSAddress'),
      signTransaction: jest.fn().mockResolvedValue('0xSignedTx'),
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', message: 'OK' }),
    };
  }),
}));

// Mock ethers minimally
jest.mock('ethers', () => {
  const mockWallet = {
    address: '0xTestWalletAddress',
    connect: jest.fn().mockReturnThis(),
  };
  return {
    ethers: {
      Wallet: jest.fn().mockReturnValue(mockWallet),
      JsonRpcProvider: jest.fn(),
    },
  };
});

import { logger } from '../../src/utils/logger';

describe('KMS Signer Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clean KMS-related env vars
    delete process.env.USE_KMS;
    delete process.env.KMS_KEY_ID;
    delete process.env.AWS_KMS_KEY_ID;
    delete process.env.MERCHANT_WALLET_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSignerProvider factory', () => {
    it('should return KMSSignerProvider when USE_KMS=true', () => {
      process.env.USE_KMS = 'true';
      process.env.KMS_KEY_ID = 'test-key-id';

      const provider = createSignerProvider();

      expect(provider).toBeInstanceOf(KMSSignerProvider);
    });

    it('should return EnvVarSignerProvider when USE_KMS=false', () => {
      process.env.USE_KMS = 'false';

      const provider = createSignerProvider();

      expect(provider).toBeInstanceOf(EnvVarSignerProvider);
    });

    it('should return EnvVarSignerProvider when USE_KMS is not set', () => {
      const provider = createSignerProvider();

      expect(provider).toBeInstanceOf(EnvVarSignerProvider);
    });
  });

  describe('KMSSignerProvider', () => {
    it('should create a signer using KMS service', async () => {
      process.env.KMS_KEY_ID = 'test-key-id';

      const provider = new KMSSignerProvider();
      const signer = await provider.getWallet('polygon');

      expect(signer).toBeDefined();
    });

    it('should throw if KMS is not configured (no key ID)', () => {
      delete process.env.KMS_KEY_ID;
      delete process.env.AWS_KMS_KEY_ID;

      expect(() => {
        new KMSSignerProvider();
      }).toThrow();
    });

    it('should log initialization without exposing any key material', async () => {
      process.env.KMS_KEY_ID = 'test-key-id';

      new KMSSignerProvider();

      // Check that logger.info was called
      expect(logger.info).toHaveBeenCalled();

      // Check that no log call contains key material
      const allCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.debug as jest.Mock).mock.calls,
      ];

      for (const call of allCalls) {
        const logStr = JSON.stringify(call);
        expect(logStr).not.toContain('MERCHANT_WALLET_PRIVATE_KEY');
        expect(logStr).not.toContain('privateKey');
        expect(logStr).not.toContain('private_key');
      }
    });
  });

  describe('EnvVarSignerProvider', () => {
    it('should throw in production mode (NODE_ENV=production)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.MERCHANT_WALLET_PRIVATE_KEY = '0x' + 'a'.repeat(64);

      const provider = new EnvVarSignerProvider();

      await expect(provider.getWallet('polygon')).rejects.toThrow(
        'Raw private key in env vars not allowed in production'
      );
    });

    it('should warn but allow in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.MERCHANT_WALLET_PRIVATE_KEY = '0x' + 'a'.repeat(64);

      const provider = new EnvVarSignerProvider();
      const wallet = await provider.getWallet('polygon');

      expect(wallet).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('NOT SAFE FOR PRODUCTION'),
        expect.any(Object)
      );
    });

    it('should warn but allow in test mode', async () => {
      process.env.NODE_ENV = 'test';
      process.env.MERCHANT_WALLET_PRIVATE_KEY = '0x' + 'a'.repeat(64);

      const provider = new EnvVarSignerProvider();
      const wallet = await provider.getWallet('polygon');

      expect(wallet).toBeDefined();
    });

    it('should throw if MERCHANT_WALLET_PRIVATE_KEY is not set', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MERCHANT_WALLET_PRIVATE_KEY;

      const provider = new EnvVarSignerProvider();

      await expect(provider.getWallet('polygon')).rejects.toThrow(
        'MERCHANT_WALLET_PRIVATE_KEY not configured'
      );
    });

    it('should never log the private key value', async () => {
      process.env.NODE_ENV = 'development';
      const testKey = '0x' + 'a'.repeat(64);
      process.env.MERCHANT_WALLET_PRIVATE_KEY = testKey;

      const provider = new EnvVarSignerProvider();
      await provider.getWallet('polygon');

      // Check all log calls for key leakage
      const allCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.warn as jest.Mock).mock.calls,
        ...(logger.error as jest.Mock).mock.calls,
        ...(logger.debug as jest.Mock).mock.calls,
      ];

      for (const call of allCalls) {
        const logStr = JSON.stringify(call);
        expect(logStr).not.toContain(testKey);
        expect(logStr).not.toContain('a'.repeat(64));
      }
    });
  });

  describe('SignerProvider interface compliance', () => {
    it('KMSSignerProvider implements SignerProvider', () => {
      process.env.KMS_KEY_ID = 'test-key-id';
      const provider: SignerProvider = new KMSSignerProvider();
      expect(typeof provider.getWallet).toBe('function');
    });

    it('EnvVarSignerProvider implements SignerProvider', () => {
      const provider: SignerProvider = new EnvVarSignerProvider();
      expect(typeof provider.getWallet).toBe('function');
    });
  });
});
