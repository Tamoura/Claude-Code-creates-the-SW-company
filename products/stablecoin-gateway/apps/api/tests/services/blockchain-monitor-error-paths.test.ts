import { BlockchainMonitorService, weiToUsd } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';
import { AppError } from '../../src/types/index';
import { ethers } from 'ethers';

/**
 * Error-path branch coverage tests for BlockchainMonitorService.
 *
 * These tests target branches that were not covered in the existing test
 * suites:
 *   - Provider initialisation failure (getProvider throws)
 *   - getTransactionReceipt RPC timeout
 *   - getBlockNumber RPC timeout (receipt received, block-number hangs)
 *   - Null receipt from provider
 *   - weiToUsd precision helper
 */

const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const MERCHANT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

const paymentSession = {
  id: 'ps_error_path_test',
  network: 'polygon' as const,
  token: 'USDC' as const,
  amount: 100,
  merchantAddress: MERCHANT,
};

/** Helper: create a ProviderManager whose getProvider always rejects */
function createFailingProviderManager(message: string): ProviderManager {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockRejectedValue(new Error(message));
  return pm;
}

/** Helper: create a ProviderManager that returns a mock provider */
function createMockProviderManager(mockProvider: any): ProviderManager {
  const pm = new ProviderManager();
  jest.spyOn(pm, 'getProvider').mockResolvedValue(mockProvider as ethers.JsonRpcProvider);
  return pm;
}

/** Helper: returns a promise that never resolves, simulating a hung RPC node */
function neverResolves(): Promise<any> {
  return new Promise(() => {
    // intentionally never resolves
  });
}

describe('BlockchainMonitorService — error-path branch coverage', () => {
  it('should throw AppError when provider fails to initialize', async () => {
    const pm = createFailingProviderManager('No providers available for polygon');
    const service = new BlockchainMonitorService({ providerManager: pm });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toMatchObject({
      code: 'invalid-network',
    });

    // Confirm it is actually an AppError instance
    try {
      await service.verifyPaymentTransaction(paymentSession, TX_HASH);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(500);
      expect((err as AppError).code).toBe('invalid-network');
    }
  });

  it('should throw blockchain-error when getTransactionReceipt times out', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockReturnValue(neverResolves()),
      getBlockNumber: jest.fn().mockResolvedValue(120),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({
      providerManager: pm,
      rpcTimeoutMs: 50, // very short timeout
    });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toMatchObject({
      code: 'blockchain-error',
    });

    try {
      await service.verifyPaymentTransaction(paymentSession, TX_HASH);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toContain('getTransactionReceipt timed out after 50ms');
    }
  });

  it('should throw blockchain-error when getBlockNumber times out after receipt is received', async () => {
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
      rpcTimeoutMs: 50,
    });

    await expect(
      service.verifyPaymentTransaction(paymentSession, TX_HASH)
    ).rejects.toMatchObject({
      code: 'blockchain-error',
    });

    try {
      await service.verifyPaymentTransaction(paymentSession, TX_HASH);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toContain('getBlockNumber timed out after 50ms');
    }
  });

  it('should handle null receipt from provider gracefully', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue(null),
      getBlockNumber: jest.fn().mockResolvedValue(120),
    };

    const pm = createMockProviderManager(mockProvider);
    const service = new BlockchainMonitorService({ providerManager: pm });

    const result = await service.verifyPaymentTransaction(paymentSession, TX_HASH);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Transaction not found on blockchain');
    expect(result.confirmations).toBe(0);
    expect(result.blockNumber).toBe(0);
    expect(result.sender).toBe('');
  });

  describe('weiToUsd', () => {
    it('should convert 1000000 wei with 6 decimals to "1"', () => {
      expect(weiToUsd('1000000', 6)).toBe('1');
    });

    it('should convert 500000 wei with 6 decimals to "0.5"', () => {
      expect(weiToUsd('500000', 6)).toBe('0.5');
    });

    it('should convert 100000000 wei with 8 decimals to "1"', () => {
      expect(weiToUsd('100000000', 8)).toBe('1');
    });

    it('should handle zero correctly', () => {
      expect(weiToUsd('0', 6)).toBe('0');
    });
  });
});
