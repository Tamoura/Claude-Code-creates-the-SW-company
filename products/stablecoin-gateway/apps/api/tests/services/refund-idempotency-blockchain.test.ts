/**
 * Refund Idempotency - Blockchain Transaction Service Tests
 *
 * Tests Redis-based idempotency key tracking on executeRefund()
 * to prevent duplicate blockchain transactions from network
 * retries or duplicate requests.
 *
 * Test cases:
 * 1. Return cached result for duplicate refund with same key
 * 2. Process refund normally when no idempotency key provided
 * 3. Process refund normally for new (unseen) idempotency key
 * 4. Store refund result with 24-hour TTL after success
 * 5. Gracefully degrade when Redis fails on idempotency check
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

// Helper: create a mock Redis with in-memory store and `set` support
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

describe('Refund Idempotency - BlockchainTransactionService', () => {
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

  describe('Duplicate refund with same idempotency key', () => {
    it('should return cached result for duplicate refund with same idempotency key', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      // First call -- should execute on chain
      const result1 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 100,
        idempotencyKey: 'refund-abc-123',
      });
      expect(result1.success).toBe(true);
      expect(result1.txHash).toBeDefined();

      // Reset mock call counts so we can detect whether the
      // blockchain transfer was called again
      mockTransferFn.mockClear();

      // Second call with same idempotency key -- should return
      // cached result without hitting blockchain
      const result2 = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 100,
        idempotencyKey: 'refund-abc-123',
      });

      expect(result2.success).toBe(true);
      expect(result2.txHash).toBe(result1.txHash);
      // The transfer function must NOT have been called again
      expect(mockTransferFn).not.toHaveBeenCalled();
    });
  });

  describe('Refund without idempotency key', () => {
    it('should process refund normally when no idempotency key provided', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 200,
        // No idempotencyKey
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      // No idempotency get/set calls should have been made
      expect(redis.get).not.toHaveBeenCalledWith(
        expect.stringContaining('refund_idem:')
      );
    });
  });

  describe('Refund with new idempotency key', () => {
    it('should process refund normally for new idempotency key', async () => {
      const redis = createMockRedis();
      const service = new BlockchainTransactionService({
        redis: redis as any,
        providerManager: createMockProviderManager(),
      });

      const result = await service.executeRefund({
        network: 'polygon',
        token: 'USDC',
        recipientAddress: VALID_ADDRESS,
        amount: 150,
        idempotencyKey: 'brand-new-key-xyz',
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeDefined();

      // Should have checked Redis (cache miss)
      expect(redis.get).toHaveBeenCalledWith(
        'refund_idem:brand-new-key-xyz'
      );
      // Should have stored the result in Redis
      expect(redis.set).toHaveBeenCalledWith(
        'refund_idem:brand-new-key-xyz',
        expect.any(String),
        'EX',
        86400
      );
    });
  });

  describe('Idempotency result storage', () => {
    it('should store refund result with 24-hour TTL after successful execution', async () => {
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
        idempotencyKey: 'ttl-test-key',
      });

      // Verify set was called with 'EX' and 86400 (24 hours)
      expect(redis.set).toHaveBeenCalledWith(
        'refund_idem:ttl-test-key',
        expect.any(String),
        'EX',
        86400
      );

      // Verify the stored JSON contains expected fields
      const storedJson = redis.set.mock.calls.find(
        (call: any[]) => call[0] === 'refund_idem:ttl-test-key'
      )?.[1];
      expect(storedJson).toBeDefined();
      const storedResult = JSON.parse(storedJson as string);
      expect(storedResult.success).toBe(true);
      expect(storedResult.txHash).toBeDefined();
      expect(storedResult.blockNumber).toBeDefined();
      expect(storedResult.gasUsed).toBeDefined();
    });
  });

  describe('Redis failure graceful degradation', () => {
    it('should gracefully degrade when Redis fails on idempotency check', async () => {
      const brokenRedis = {
        get: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        set: jest
          .fn()
          .mockRejectedValue(new Error('Connection refused')),
        incrby: jest.fn(async (key: string, increment: number) => {
          // Allow spending limit to work so the refund proceeds
          return increment;
        }),
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
        idempotencyKey: 'redis-broken-key',
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      // get was attempted (then failed gracefully)
      expect(brokenRedis.get).toHaveBeenCalledWith(
        'refund_idem:redis-broken-key'
      );
    });
  });
});
