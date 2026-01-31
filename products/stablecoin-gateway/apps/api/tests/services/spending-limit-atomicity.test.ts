/**
 * Spending Limit Atomicity Tests
 *
 * Verifies that the spending limit check and record are performed
 * atomically via a Redis Lua script, preventing two concurrent
 * refund requests from both passing the check before either records
 * its spend.
 *
 * Test cases:
 * 1. Should atomically check and record spend within limit
 * 2. Should atomically reject spend exceeding limit
 * 3. Should prevent concurrent requests from exceeding daily limit
 * 4. Should gracefully degrade when Redis eval is unavailable
 * 5. Should set TTL on spend key
 */

const actualEthers = jest.requireActual('ethers');
const validKey = '0x' + 'a'.repeat(64);
const mockWallet = new actualEthers.ethers.Wallet(validKey);

// Mock KMS signer service (must be before service import)
jest.mock('../../src/services/kms-signer.service', () => ({
  createSignerProvider: jest.fn().mockReturnValue({
    getWallet: jest.fn().mockResolvedValue(mockWallet),
  }),
  KMSSignerProvider: jest.fn(),
  EnvVarSignerProvider: jest.fn(),
}));

// Build a mock transfer function for successful on-chain tx
const mockTransferFn = jest.fn().mockResolvedValue({
  hash: '0x' + 'b'.repeat(64),
  wait: jest.fn().mockResolvedValue({
    status: 1,
    blockNumber: 12345,
    gasUsed: BigInt(65000),
  }),
});
mockTransferFn.estimateGas = jest.fn().mockResolvedValue(BigInt(65000));

// Mock ethers -- keep isAddress, Wallet, formatEther real
jest.mock('ethers', () => {
  const real = jest.requireActual('ethers');
  return {
    ...real,
    ethers: {
      ...real.ethers,
      JsonRpcProvider: jest.fn().mockImplementation((url?: string) => ({
        getBlockNumber: jest.fn().mockResolvedValue(12345),
        _getConnection: jest.fn().mockReturnValue({
          url: url || 'https://mock-rpc.com',
        }),
      })),
      Contract: jest.fn().mockImplementation(() => ({
        transfer: mockTransferFn,
      })),
    },
  };
});

import {
  BlockchainTransactionService,
  SpendingLimitRedis,
} from '../../src/services/blockchain-transaction.service';
import { ProviderManager } from '../../src/utils/provider-manager';

// Checksummed address for ethers v6
const VALID_ADDRESS = '0x0b7Eb565F75758f61F4A83F7E995B9C3201B482b';

function createMockProviderManager() {
  const pm = new ProviderManager();
  pm.addProviders('polygon', ['https://polygon-test.com']);
  pm.addProviders('ethereum', ['https://ethereum-test.com']);
  return pm;
}

/**
 * Create a mock Redis client that supports the `eval` method
 * for atomic Lua script execution.
 *
 * The mock simulates the Lua script behavior in-process so we
 * can verify correctness without a real Redis instance.
 */
function createAtomicMockRedis() {
  const store: Record<string, string> = {};

  const redis = {
    store,
    get: jest.fn(async (key: string) => store[key] || null),
    incrby: jest.fn(async (key: string, increment: number) => {
      const current = parseInt(store[key] || '0', 10);
      const newVal = current + increment;
      store[key] = String(newVal);
      return newVal;
    }),
    expire: jest.fn(async () => 1),
    eval: jest.fn(
      async (
        _script: string,
        numkeys: number,
        ...args: (string | number)[]
      ) => {
        // Simulate the Lua script behavior:
        // KEYS[1] = args[0] (the spend key)
        // ARGV[1] = args[1] (limitCents)
        // ARGV[2] = args[2] (amountCents)
        // ARGV[3] = args[3] (ttl)
        const key = String(args[0]);
        const limit = Number(args[1]);
        const amount = Number(args[2]);
        const ttl = Number(args[3]);

        const current = parseInt(store[key] || '0', 10);

        if (current + amount > limit) {
          return 0; // Would exceed limit
        }

        // Atomically increment
        store[key] = String(current + amount);
        return 1; // Success
      }
    ),
  };

  return redis;
}

describe('Spending Limit Atomicity', () => {
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

  describe('should atomically check and record spend within limit', () => {
    it('succeeds and records spend in a single atomic operation', async () => {
      const redis = createAtomicMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();

      // The atomic eval should have been called (not separate get + incrby)
      expect(redis.eval).toHaveBeenCalledTimes(1);

      // The spend should already be recorded by the atomic call
      // so recordSpend (incrby) should NOT be called separately
      expect(redis.incrby).not.toHaveBeenCalled();

      // Verify the store has the spend recorded
      const today = new Date().toISOString().split('T')[0];
      const key = `spend:daily:${today}`;
      expect(parseInt(redis.store[key] || '0', 10)).toBe(50000); // 500 * 100 cents
    });
  });

  describe('should atomically reject spend exceeding limit', () => {
    it('rejects when amount exceeds daily limit', async () => {
      const redis = createAtomicMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      // Default limit is $10,000; try $10,001
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

      // eval was called but should have returned 0 (rejected)
      expect(redis.eval).toHaveBeenCalledTimes(1);

      // No spend should be recorded since the Lua script rejected it
      const today = new Date().toISOString().split('T')[0];
      const key = `spend:daily:${today}`;
      expect(redis.store[key]).toBeUndefined();
    });

    it('rejects when cumulative spend would exceed limit', async () => {
      const redis = createAtomicMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      // First refund: $6,000 (within $10,000 limit)
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

      // Two eval calls, but only first should have recorded spend
      expect(redis.eval).toHaveBeenCalledTimes(2);
    });
  });

  describe('should prevent concurrent requests from exceeding daily limit', () => {
    it('only one of two concurrent requests succeeds when both would exceed the limit', async () => {
      // Use a mock Redis with a serialized eval to simulate atomicity
      const store: Record<string, string> = {};
      let evalCallCount = 0;

      const redis = {
        store,
        get: jest.fn(async (key: string) => store[key] || null),
        incrby: jest.fn(async (key: string, increment: number) => {
          const current = parseInt(store[key] || '0', 10);
          const newVal = current + increment;
          store[key] = String(newVal);
          return newVal;
        }),
        expire: jest.fn(async () => 1),
        eval: jest.fn(
          async (
            _script: string,
            _numkeys: number,
            ...args: (string | number)[]
          ) => {
            evalCallCount++;
            const key = String(args[0]);
            const limit = Number(args[1]);
            const amount = Number(args[2]);

            // Simulate atomic Lua: read, check, conditionally write
            const current = parseInt(store[key] || '0', 10);
            if (current + amount > limit) {
              return 0;
            }
            store[key] = String(current + amount);
            return 1;
          }
        ),
      };

      process.env.DAILY_REFUND_LIMIT = '10000';
      const service = new BlockchainTransactionService({
        redis: redis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      // Two concurrent $6,000 refunds (total $12,000 > $10,000 limit)
      const [result1, result2] = await Promise.all([
        service.executeRefund({
          network: 'polygon',
          token: 'USDC',
          recipientAddress: VALID_ADDRESS,
          amount: 6000,
        }),
        service.executeRefund({
          network: 'polygon',
          token: 'USDC',
          recipientAddress: VALID_ADDRESS,
          amount: 6000,
        }),
      ]);

      const successes = [result1, result2].filter((r) => r.success);
      const failures = [result1, result2].filter((r) => !r.success);

      // Exactly one should succeed, one should fail
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toBe(
        'Daily refund limit exceeded - manual approval required'
      );

      // Both should have called eval (atomic check)
      expect(evalCallCount).toBe(2);

      // Total recorded spend should be exactly $6,000 (600000 cents), not $12,000
      const today = new Date().toISOString().split('T')[0];
      const key = `spend:daily:${today}`;
      expect(parseInt(store[key] || '0', 10)).toBe(600000);
    });
  });

  describe('should gracefully degrade when Redis eval is unavailable', () => {
    it('allows refund when eval throws an error', async () => {
      const brokenRedis = {
        get: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        incrby: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        expire: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        eval: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
      };

      const service = new BlockchainTransactionService({
        redis: brokenRedis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      // Should succeed with graceful degradation
      expect(result.success).toBe(true);
      expect(brokenRedis.eval).toHaveBeenCalledTimes(1);
    });

    it('allows refund when no Redis is configured', async () => {
      const service = new BlockchainTransactionService({
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 500,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('should set TTL on spend key', () => {
    it('passes TTL to the atomic Lua script', async () => {
      const redis = createAtomicMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as unknown as SpendingLimitRedis,
        providerManager: createMockProviderManager(),
      });

      await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 100,
      });

      // Verify eval was called with the TTL argument (172800 = 48 hours)
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String), // Lua script
        1, // numkeys
        expect.stringContaining('spend:daily:'), // KEYS[1]
        expect.any(Number), // limitCents (ARGV[1])
        10000, // amountCents for $100 (ARGV[2])
        172800 // TTL in seconds (ARGV[3])
      );
    });
  });
});
