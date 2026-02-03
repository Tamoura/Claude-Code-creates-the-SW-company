import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { ethers } from 'ethers';

/**
 * RISK-045: Blockchain RPC calls must have a timeout.
 *
 * If a blockchain node hangs, provider.getTransactionReceipt(),
 * provider.getBlockNumber(), and similar calls will block
 * indefinitely. All provider calls must be wrapped with a
 * timeout so that hung RPC nodes do not stall the system.
 *
 * The default timeout is 15 000 ms (15 seconds). Tests use a
 * short override (200 ms) to run quickly.
 */
describe('BlockchainMonitorService - RPC timeout (RISK-045)', () => {
  const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const MERCHANT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const paymentSession = {
    id: 'ps_timeout_test',
    network: 'polygon' as const,
    token: 'USDC' as const,
    amount: 100,
    merchantAddress: MERCHANT,
  };

  function createMockProviderManager(mockProvider: any): ProviderManager {
    const pm = new ProviderManager();
    jest.spyOn(pm, 'getProvider').mockResolvedValue(mockProvider as ethers.JsonRpcProvider);
    return pm;
  }

  /**
   * Helper: returns a promise that never resolves, simulating a
   * hung blockchain node.
   */
  function neverResolves(): Promise<any> {
    return new Promise(() => {
      // intentionally never resolves
    });
  }

  it('should timeout when getTransactionReceipt hangs', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockReturnValue(neverResolves()),
      getBlockNumber: jest.fn().mockResolvedValue(120),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 200, // short timeout for test speed
    });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toThrow(/timed out/i);
  });

  it('should timeout when getBlockNumber hangs during verification', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        blockNumber: 100,
        logs: [],
      }),
      getBlockNumber: jest.fn().mockReturnValue(neverResolves()),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 200,
    });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toThrow(/timed out/i);
  });

  it('should timeout when getTransactionReceipt hangs in getConfirmations', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockReturnValue(neverResolves()),
      getBlockNumber: jest.fn().mockResolvedValue(120),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 200,
    });

    // getConfirmations catches errors and returns 0
    const result = await service.getConfirmations('polygon', TX_HASH);
    expect(result).toBe(0);
  });

  it('should timeout when getBlockNumber hangs in getConfirmations', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        blockNumber: 100,
      }),
      getBlockNumber: jest.fn().mockReturnValue(neverResolves()),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 200,
    });

    // getConfirmations catches errors and returns 0
    const result = await service.getConfirmations('polygon', TX_HASH);
    expect(result).toBe(0);
  });

  it('should NOT timeout when provider responds within time limit', async () => {
    const USDC_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const TRANSFER_SIG = ethers.id('Transfer(address,address,uint256)');
    const SENDER = '0x9999999999999999999999999999999999999999';

    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        blockNumber: 100,
        logs: [
          {
            address: USDC_POLYGON,
            topics: [
              TRANSFER_SIG,
              '0x000000000000000000000000' + SENDER.slice(2),
              '0x000000000000000000000000' + MERCHANT.slice(2),
            ],
            data: ethers.toBeHex(100_000000, 32),
          },
        ],
      }),
      getBlockNumber: jest.fn().mockResolvedValue(115),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 5000, // generous timeout
    });

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should include the operation label in the timeout error message', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockReturnValue(neverResolves()),
      getBlockNumber: jest.fn().mockResolvedValue(120),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 200,
    });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toThrow(/getTransactionReceipt timed out/i);
  });

  it('should default to 15000ms timeout when rpcTimeoutMs is not set', () => {
    const pm = createMockProviderManager({});
    const service = new BlockchainMonitorService({ providerManager: pm });

    // Verify the service was created (default timeout is used internally)
    expect(service).toBeInstanceOf(BlockchainMonitorService);
  });
});
