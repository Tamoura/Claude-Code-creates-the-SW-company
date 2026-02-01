/**
 * Provider Failover Tests
 *
 * Tests the ProviderManager utility that provides RPC provider
 * failover with health checks for blockchain services.
 *
 * Coverage:
 * - Primary provider works normally
 * - When primary fails, fallback provider is used
 * - When all providers fail, descriptive error is thrown
 * - Failed provider is retried after cooldown period
 * - Each network has independent failover
 * - Provider health checked via getBlockNumber()
 */

import { ethers } from 'ethers';
import { ProviderManager } from '../../src/utils/provider-manager';

// Suppress logger output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// We mock ethers.JsonRpcProvider at the instance level via spies,
// not at the module level, so we can control per-provider behavior.

function createMockProvider(url: string, healthy: boolean): ethers.JsonRpcProvider {
  const provider = Object.create(ethers.JsonRpcProvider.prototype) as ethers.JsonRpcProvider;

  // Mock _getConnection to return the URL
  jest.spyOn(provider, '_getConnection').mockReturnValue({
    url,
  } as ReturnType<ethers.JsonRpcProvider['_getConnection']>);

  // Mock getBlockNumber based on health
  if (healthy) {
    jest.spyOn(provider, 'getBlockNumber').mockResolvedValue(12345);
  } else {
    jest.spyOn(provider, 'getBlockNumber').mockRejectedValue(
      new Error('connection refused')
    );
  }

  return provider;
}

describe('ProviderManager', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    manager = new ProviderManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Primary provider works normally', () => {
    it('should return the primary provider when healthy', async () => {
      const primary = createMockProvider('https://primary-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary]);

      const result = await manager.getProvider('polygon');

      expect(result).toBe(primary);
      expect(primary.getBlockNumber).toHaveBeenCalledTimes(1);
    });

    it('should not check fallback providers when primary is healthy', async () => {
      const primary = createMockProvider('https://primary-rpc.com', true);
      const fallback = createMockProvider('https://fallback-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      const result = await manager.getProvider('polygon');

      expect(result).toBe(primary);
      expect(primary.getBlockNumber).toHaveBeenCalledTimes(1);
      expect(fallback.getBlockNumber).not.toHaveBeenCalled();
    });
  });

  describe('Fallback when primary fails', () => {
    it('should use fallback provider when primary fails health check', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback = createMockProvider('https://fallback-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      const result = await manager.getProvider('polygon');

      expect(result).toBe(fallback);
      expect(primary.getBlockNumber).toHaveBeenCalledTimes(1);
      expect(fallback.getBlockNumber).toHaveBeenCalledTimes(1);
    });

    it('should use second fallback when first two fail', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback1 = createMockProvider('https://fallback1-rpc.com', false);
      const fallback2 = createMockProvider('https://fallback2-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback1, fallback2]);

      const result = await manager.getProvider('polygon');

      expect(result).toBe(fallback2);
    });
  });

  describe('All providers fail', () => {
    it('should throw descriptive error when all providers fail', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback = createMockProvider('https://fallback-rpc.com', false);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      await expect(manager.getProvider('polygon')).rejects.toThrow(
        'All providers failed for network: polygon'
      );
    });

    it('should throw error for unknown network', async () => {
      await expect(manager.getProvider('polygon')).rejects.toThrow(
        'All providers failed for network: polygon'
      );
    });
  });

  describe('Cooldown and retry', () => {
    it('should skip failed provider during cooldown period', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback = createMockProvider('https://fallback-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      // First call: primary fails, fallback used
      const result1 = await manager.getProvider('polygon');
      expect(result1).toBe(fallback);

      // Second call within cooldown: primary should be skipped entirely
      jest.spyOn(primary, 'getBlockNumber').mockClear();
      const result2 = await manager.getProvider('polygon');
      expect(result2).toBe(fallback);
      expect(primary.getBlockNumber).not.toHaveBeenCalled();
    });

    it('should retry failed provider after cooldown expires', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback = createMockProvider('https://fallback-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      // First call: primary fails
      await manager.getProvider('polygon');

      // Advance past cooldown (60 seconds)
      jest.advanceTimersByTime(61000);

      // Make primary healthy again
      jest.spyOn(primary, 'getBlockNumber').mockResolvedValue(12345);

      // After cooldown, primary should be retried and succeed
      const result = await manager.getProvider('polygon');
      expect(result).toBe(primary);
    });

    it('should clear failed status when provider recovers', async () => {
      const primary = createMockProvider('https://primary-rpc.com', false);
      const fallback = createMockProvider('https://fallback-rpc.com', true);
      manager.addProvidersDirectly('polygon', [primary, fallback]);

      // First call: primary fails
      await manager.getProvider('polygon');

      // Advance past cooldown
      jest.advanceTimersByTime(61000);

      // Primary recovers
      jest.spyOn(primary, 'getBlockNumber').mockResolvedValue(12345);
      const result1 = await manager.getProvider('polygon');
      expect(result1).toBe(primary);

      // Advance past health cache TTL (30s) so cached result expires
      jest.advanceTimersByTime(31000);

      // Next call: primary should not be skipped (failure cleared)
      jest.spyOn(primary, 'getBlockNumber').mockClear();
      jest.spyOn(primary, 'getBlockNumber').mockResolvedValue(12345);
      const result2 = await manager.getProvider('polygon');
      expect(result2).toBe(primary);
      expect(primary.getBlockNumber).toHaveBeenCalledTimes(1);
    });
  });

  describe('Independent network failover', () => {
    it('should maintain independent failover state per network', async () => {
      const polygonPrimary = createMockProvider('https://polygon-primary.com', false);
      const polygonFallback = createMockProvider('https://polygon-fallback.com', true);
      const ethPrimary = createMockProvider('https://eth-primary.com', true);
      const ethFallback = createMockProvider('https://eth-fallback.com', true);

      manager.addProvidersDirectly('polygon', [polygonPrimary, polygonFallback]);
      manager.addProvidersDirectly('ethereum', [ethPrimary, ethFallback]);

      // Polygon primary fails, uses fallback
      const polygonResult = await manager.getProvider('polygon');
      expect(polygonResult).toBe(polygonFallback);

      // Ethereum primary should still work (independent)
      const ethResult = await manager.getProvider('ethereum');
      expect(ethResult).toBe(ethPrimary);
    });

    it('should not affect other networks when one network fails', async () => {
      const polygonPrimary = createMockProvider('https://polygon-primary.com', false);
      const polygonFallback = createMockProvider('https://polygon-fallback.com', false);
      const ethPrimary = createMockProvider('https://eth-primary.com', true);

      manager.addProvidersDirectly('polygon', [polygonPrimary, polygonFallback]);
      manager.addProvidersDirectly('ethereum', [ethPrimary]);

      // Polygon fails entirely
      await expect(manager.getProvider('polygon')).rejects.toThrow(
        'All providers failed for network: polygon'
      );

      // Ethereum should still work
      const ethResult = await manager.getProvider('ethereum');
      expect(ethResult).toBe(ethPrimary);
    });
  });

  describe('Health check via getBlockNumber', () => {
    it('should call getBlockNumber to verify provider health', async () => {
      const provider = createMockProvider('https://rpc.com', true);
      manager.addProvidersDirectly('polygon', [provider]);

      await manager.getProvider('polygon');

      expect(provider.getBlockNumber).toHaveBeenCalledTimes(1);
    });

    it('should treat getBlockNumber rejection as unhealthy', async () => {
      const unhealthy = createMockProvider('https://unhealthy.com', false);
      const healthy = createMockProvider('https://healthy.com', true);
      manager.addProvidersDirectly('polygon', [unhealthy, healthy]);

      const result = await manager.getProvider('polygon');
      expect(result).toBe(healthy);
    });
  });

  describe('addProviders from URLs', () => {
    it('should filter out empty and whitespace-only URLs', () => {
      // addProviders creates real providers; we test it doesn't throw
      // on empty strings or whitespace
      expect(() => {
        manager.addProviders('polygon', ['https://rpc.com', '', '  ', 'https://backup.com']);
      }).not.toThrow();
    });

    it('should handle single URL string', () => {
      expect(() => {
        manager.addProviders('polygon', ['https://rpc.com']);
      }).not.toThrow();
    });
  });
});
