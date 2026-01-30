/**
 * Wallet Spending Limits Tests
 *
 * Tests daily spending cap on the hot wallet used for refunds.
 * A compromised KMS key must not allow unlimited fund drainage.
 *
 * FIX: Hot Wallet Has No Spending Limits
 *
 * Test cases:
 * 1. Refund within daily limit succeeds
 * 2. Refund exceeding daily limit is rejected with error
 * 3. Multiple refunds accumulate toward daily limit
 * 4. Daily limit resets at midnight UTC
 * 5. DAILY_REFUND_LIMIT env var configures the cap
 * 6. Default limit is $10,000 when env var not set
 * 7. Graceful degradation when Redis is unavailable
 */

const actualEthers = jest.requireActual('ethers');
const validKey = '0x' + 'a'.repeat(64);
const mockWallet = new actualEthers.ethers.Wallet(validKey);

// Mock the KMS signer service (must be before service import)
jest.mock('../../src/services/kms-signer.service', () => ({
  createSignerProvider: jest.fn().mockReturnValue({
    getWallet: jest.fn().mockResolvedValue(mockWallet),
  }),
  KMSSignerProvider: jest.fn(),
  EnvVarSignerProvider: jest.fn(),
}));

// Build a mock transfer function that simulates a successful on-chain tx
const mockTransferFn = jest.fn().mockResolvedValue({
  hash: '0x' + 'b'.repeat(64),
  wait: jest.fn().mockResolvedValue({
    status: 1,
    blockNumber: 12345,
    gasUsed: BigInt(65000),
  }),
});
mockTransferFn.estimateGas = jest.fn().mockResolvedValue(BigInt(65000));

// Mock ethers — keep isAddress, Wallet, formatEther real
jest.mock('ethers', () => {
  const real = jest.requireActual('ethers');
  return {
    ...real,
    ethers: {
      ...real.ethers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
      Contract: jest.fn().mockImplementation(() => ({
        transfer: mockTransferFn,
      })),
    },
  };
});

import {
  BlockchainTransactionService,
} from '../../src/services/blockchain-transaction.service';

// Properly checksummed address (ethers v6 strict checksum)
const VALID_ADDRESS = '0x0b7Eb565F75758f61F4A83F7E995B9C3201B482b';

// Helper: create a mock Redis client with in-memory store
function createMockRedis() {
  const store: Record<string, string> = {};
  return {
    store,
    get: jest.fn(async (key: string) => store[key] || null),
    set: jest.fn(async (key: string, value: string) => {
      store[key] = value;
      return 'OK';
    }),
    incrby: jest.fn(async (key: string, increment: number) => {
      const current = parseInt(store[key] || '0', 10);
      const newVal = current + increment;
      store[key] = String(newVal);
      return newVal;
    }),
    expire: jest.fn(async () => 1),
    status: 'ready',
  };
}

describe('Wallet Spending Limits', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.POLYGON_RPC_URL = 'https://polygon-test.com';
    process.env.ETHEREUM_RPC_URL = 'https://ethereum-test.com';
    delete process.env.DAILY_REFUND_LIMIT;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Default limit', () => {
    it('should default to $10,000 daily limit when env var not set', async () => {
      delete process.env.DAILY_REFUND_LIMIT;
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      // A $10,000 refund should succeed (exactly at limit)
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 10000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('DAILY_REFUND_LIMIT env var configures the cap', () => {
    it('should use the env var value as the daily limit', async () => {
      process.env.DAILY_REFUND_LIMIT = '5000';
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      // $5,001 should exceed the $5,000 limit
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 5001,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily refund limit exceeded');
    });
  });

  describe('Refund within daily limit succeeds', () => {
    it('should allow a refund that is under the daily limit', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });
  });

  describe('Refund exceeding daily limit is rejected', () => {
    it('should reject a single refund that exceeds the daily limit', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 10001,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Daily refund limit exceeded - manual approval required'
      );
    });
  });

  describe('Multiple refunds accumulate toward daily limit', () => {
    it('should track cumulative spend and reject when limit reached', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      // First refund: $6,000 (under $10,000 limit)
      const result1 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 6000,
      });
      expect(result1.success).toBe(true);

      // Second refund: $5,000 (cumulative $11,000 exceeds limit)
      const result2 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 5000,
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe(
        'Daily refund limit exceeded - manual approval required'
      );
    });
  });

  describe('Daily limit resets at midnight UTC', () => {
    it('should use date-based Redis key so limit resets daily', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({ redis: redis as any });

      // Execute a refund to populate the Redis key
      await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      // Verify the Redis key includes today's date (YYYY-MM-DD format)
      const today = new Date().toISOString().split('T')[0];
      const expectedKeyPattern = `spend:daily:${today}`;

      // The incrby call should have used a date-based key
      expect(redis.incrby).toHaveBeenCalledWith(
        expectedKeyPattern,
        expect.any(Number)
      );

      // Verify TTL was set (48 hours = 172800 seconds)
      expect(redis.expire).toHaveBeenCalledWith(
        expectedKeyPattern,
        172800
      );
    });
  });

  describe('Graceful degradation when Redis unavailable', () => {
    it('should allow the refund when Redis is not provided', async () => {
      // No redis option passed
      const service = new BlockchainTransactionService();

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      // Should still succeed (graceful degradation)
      expect(result.success).toBe(true);
    });

    it('should allow refund when Redis throws an error', async () => {
      const brokenRedis = {
        get: jest.fn().mockRejectedValue(new Error('Connection refused')),
        incrby: jest.fn().mockRejectedValue(new Error('Connection refused')),
        set: jest.fn().mockRejectedValue(new Error('Connection refused')),
        expire: jest.fn().mockRejectedValue(new Error('Connection refused')),
        status: 'end',
      };

      const service = new BlockchainTransactionService({
        redis: brokenRedis as any,
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      // Should succeed with warning logged, not block the refund
      expect(result.success).toBe(true);
    });
  });
});
