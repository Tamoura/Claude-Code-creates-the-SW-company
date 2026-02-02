/**
 * Refund Idempotency - Blockchain Transaction Service Tests
 *
 * The BlockchainTransactionService does NOT implement idempotency
 * at the blockchain layer (no idempotencyKey in executeRefund params).
 * Idempotency is handled at the RefundService layer in Prisma.
 *
 * These tests verify that:
 * 1. executeRefund processes normally and returns expected results
 * 2. Redis is used for spending limit tracking (get/incrby/expire)
 * 3. The service works correctly when Redis is unavailable
 * 4. Multiple calls each execute independently (no caching at this layer)
 */

const actualEthers = jest.requireActual('ethers');
const validKey = '0x' + 'a'.repeat(64);
const mockWallet = new actualEthers.ethers.Wallet(validKey);

// Mock KMS signer service (must precede service import)
jest.mock('../../src/services/kms-signer.service', () => ({
  createSignerProvider: jest.fn().mockReturnValue({
    getWallet: jest.fn().mockResolvedValue(mockWallet),
  }),
  KMSSignerProvider: jest.fn(),
  EnvVarSignerProvider: jest.fn(),
}));

// Build a mock transfer that simulates a successful on-chain tx
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

// Properly checksummed address (ethers v6 strict checksum)
const VALID_ADDRESS = '0x0b7Eb565F75758f61F4A83F7E995B9C3201B482b';

// Helper: create a mock ProviderManager with working providers
function createMockProviderManager() {
  const pm = new ProviderManager();
  pm.addProviders('polygon', ['https://polygon-test.com']);
  pm.addProviders('ethereum', ['https://ethereum-test.com']);
  return pm;
}

// Helper: create a mock Redis with in-memory store
function createMockRedis() {
  const store: Record<string, string> = {};
  return {
    store,
    get: jest.fn(async (key: string) => store[key] || null),
    set: jest.fn(
      async (key: string, value: string, ..._args: (string | number)[]) => {
        store[key] = value;
        return 'OK';
      }
    ),
    incrby: jest.fn(async (key: string, increment: number) => {
      const current = parseInt(store[key] || '0', 10);
      const newVal = current + increment;
      store[key] = String(newVal);
      return newVal;
    }),
    expire: jest.fn(async () => 1),
  };
}

describe('Refund Execution - BlockchainTransactionService', () => {
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

  describe('Successful refund execution', () => {
    it('should execute refund and return result with txHash and blockNumber', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 100,
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeDefined();
      expect(result.gasUsed).toBeDefined();
    });
  });

  describe('Refund without Redis', () => {
    it('should process refund normally when no Redis is provided', async () => {
      const service = new BlockchainTransactionService({
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 200,
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });
  });

  describe('Multiple independent refund executions', () => {
    it('should execute each refund independently', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      const result1 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 150,
      });

      expect(result1.success).toBe(true);
      expect(result1.txHash).toBeDefined();
      expect(result1.blockNumber).toBeDefined();

      // Second call should also execute (no caching at this layer)
      const result2 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 150,
      });

      expect(result2.success).toBe(true);
      expect(result2.txHash).toBeDefined();

      // Both calls executed the transfer function
      expect(mockTransferFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Spending limit tracking with Redis', () => {
    it('should reserve spend via incrby and set TTL via expire', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 50,
      });

      const today = new Date().toISOString().split('T')[0];
      const expectedKey = `spend:daily:${today}`;

      // Verify incrby was called to atomically reserve spend (5000 cents)
      expect(redis.incrby).toHaveBeenCalledWith(expectedKey, 5000);

      // Verify expire was called with 86400 * 2 = 172800 (48 hours)
      expect(redis.expire).toHaveBeenCalledWith(expectedKey, 172800);
    });
  });

  describe('Redis failure graceful degradation', () => {
    it('should gracefully degrade when Redis fails', async () => {
      const brokenRedis = {
        get: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        set: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        incrby: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        expire: jest.fn(async () => 1),
      };

      const service = new BlockchainTransactionService({
        redis: brokenRedis as any,
        providerManager: createMockProviderManager(),
      });

      // Should still succeed even though Redis is broken
      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 75,
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      // incrby was attempted (then failed gracefully)
      expect(brokenRedis.incrby).toHaveBeenCalled();
    });
  });
});
