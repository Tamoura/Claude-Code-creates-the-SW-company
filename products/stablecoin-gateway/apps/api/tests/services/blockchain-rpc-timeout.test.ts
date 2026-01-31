/**
 * Blockchain RPC Timeout Tests
 *
 * Verifies that RPC calls to blockchain nodes are wrapped with
 * a timeout (Promise.race) to prevent hung connections from
 * blocking the service indefinitely.
 */

import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';
import { ProviderManager } from '../../src/utils/provider-manager';

describe('BlockchainMonitorService - RPC Timeouts', () => {
  it('should reject after timeout when getTransactionReceipt hangs', async () => {
    // Create a mock provider that never resolves
    const mockProvider = {
      getTransactionReceipt: jest.fn(() => new Promise(() => {})), // never resolves
      getBlockNumber: jest.fn(() => new Promise(() => {})),
    };

    const mockProviderManager = {
      getProvider: jest.fn().mockResolvedValue(mockProvider),
      addProviders: jest.fn(),
    } as unknown as ProviderManager;

    const service = new BlockchainMonitorService({
      providerManager: mockProviderManager,
    });

    // getConfirmations should return 0 (error path) rather than hang forever
    const result = await service.getConfirmations('polygon', '0xabc123');
    expect(result).toBe(0);

    // Verify the provider was called
    expect(mockProvider.getTransactionReceipt).toHaveBeenCalled();
  }, 15000); // Allow up to 15 seconds for the timeout to trigger

  it('should still work normally when RPC responds quickly', async () => {
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({
        blockNumber: 100,
      }),
      getBlockNumber: jest.fn().mockResolvedValue(112),
    };

    const mockProviderManager = {
      getProvider: jest.fn().mockResolvedValue(mockProvider),
      addProviders: jest.fn(),
    } as unknown as ProviderManager;

    const service = new BlockchainMonitorService({
      providerManager: mockProviderManager,
    });

    const confirmations = await service.getConfirmations('polygon', '0xabc123');
    expect(confirmations).toBe(13); // 112 - 100 + 1
  });
});
