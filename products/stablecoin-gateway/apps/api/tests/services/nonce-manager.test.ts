/**
 * NonceManager Service Tests
 *
 * Tests Redis-based distributed nonce management for blockchain
 * transactions. Ensures concurrent refund transactions cannot
 * submit with the same nonce.
 *
 * Test cases:
 * 1. getNextNonce returns correct nonce from network on first use
 * 2. Concurrent calls are serialized via Redis lock
 * 3. Lock timeout releases stuck locks
 * 4. Nonce tracking persists across calls
 * 5. resetNonce clears tracked nonce
 * 6. Falls back to network nonce when no tracked nonce exists
 * 7. Uses higher of network pending nonce vs tracked nonce
 * 8. confirmNonce updates tracked nonce
 * 9. Lock release is safe (only owner can release)
 */

import { NonceManager } from '../../src/services/nonce-manager.service';

// Mock Redis client
function createMockRedis() {
  const store: Record<string, string> = {};
  return {
    store,
    set: jest.fn(
      async (
        key: string,
        value: string,
        _mode?: string,
        _duration?: number,
        flag?: string
      ) => {
        if (flag === 'NX' && store[key]) {
          return null; // Key already exists, NX fails
        }
        store[key] = value;
        return 'OK';
      }
    ),
    get: jest.fn(async (key: string) => {
      return store[key] || null;
    }),
    del: jest.fn(async (key: string) => {
      delete store[key];
      return 1;
    }),
  };
}

// Mock ethers provider
function createMockProvider(pendingNonce: number) {
  return {
    getTransactionCount: jest.fn(async () => pendingNonce),
  };
}

describe('NonceManager', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;
  let nonceManager: NonceManager;

  beforeEach(() => {
    mockRedis = createMockRedis();
    nonceManager = new NonceManager(mockRedis as any, 5000);
  });

  describe('getNextNonce', () => {
    it('should return the network pending nonce on first use', async () => {
      const mockProvider = createMockProvider(5);
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

      const nonce = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );

      expect(nonce).toBe(5);
      expect(mockProvider.getTransactionCount).toHaveBeenCalledWith(
        walletAddress,
        'pending'
      );
    });

    it('should acquire and release Redis lock during nonce acquisition', async () => {
      const mockProvider = createMockProvider(0);
      const walletAddress = '0xaabbccdd';

      await nonceManager.getNextNonce(walletAddress, mockProvider as any);

      // Should have called set with NX for lock acquisition
      expect(mockRedis.set).toHaveBeenCalledWith(
        `nonce_lock:${walletAddress}`,
        expect.any(String),
        'PX',
        5000,
        'NX'
      );
      // Lock should be released after (key deleted)
      expect(mockRedis.del).toHaveBeenCalledWith(
        `nonce_lock:${walletAddress}`
      );
    });

    it('should throw error when lock cannot be acquired', async () => {
      const mockProvider = createMockProvider(0);
      const walletAddress = '0xlockedwallet';

      // Simulate another process holding the lock
      mockRedis.store[`nonce_lock:${walletAddress}`] = 'other-owner';

      await expect(
        nonceManager.getNextNonce(walletAddress, mockProvider as any)
      ).rejects.toThrow(
        'Could not acquire nonce lock - another transaction in progress'
      );
    });

    it('should use tracked nonce + 1 when higher than network nonce', async () => {
      const walletAddress = '0xtrackednonce';
      const mockProvider = createMockProvider(3);

      // Simulate a previously tracked nonce higher than network
      mockRedis.store[`nonce:${walletAddress}`] = '10';

      const nonce = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );

      // tracked (10) + 1 = 11, which is higher than network (3)
      expect(nonce).toBe(11);
    });

    it('should use network nonce when higher than tracked nonce + 1', async () => {
      const walletAddress = '0xnetworkhigher';
      const mockProvider = createMockProvider(20);

      // Tracked nonce is lower
      mockRedis.store[`nonce:${walletAddress}`] = '5';

      const nonce = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );

      // network (20) is higher than tracked (5) + 1 = 6
      expect(nonce).toBe(20);
    });

    it('should persist the chosen nonce in Redis', async () => {
      const walletAddress = '0xpersistnonce';
      const mockProvider = createMockProvider(7);

      await nonceManager.getNextNonce(walletAddress, mockProvider as any);

      // Should have stored the nonce
      expect(mockRedis.set).toHaveBeenCalledWith(
        `nonce:${walletAddress}`,
        '7'
      );
    });

    it('should release lock even if provider call fails', async () => {
      const walletAddress = '0xerrorwallet';
      const mockProvider = {
        getTransactionCount: jest.fn(async () => {
          throw new Error('RPC timeout');
        }),
      };

      await expect(
        nonceManager.getNextNonce(walletAddress, mockProvider as any)
      ).rejects.toThrow('RPC timeout');

      // Lock should still be released
      expect(mockRedis.del).toHaveBeenCalledWith(
        `nonce_lock:${walletAddress}`
      );
    });

    it('should only release lock if still owned by this caller', async () => {
      const walletAddress = '0xsaferelease';
      const mockProvider = createMockProvider(0);

      // Override get to return a different value than what set stored
      // simulating lock takeover by another process
      mockRedis.set = jest.fn(
        async (
          key: string,
          value: string,
          _mode?: string,
          _duration?: number,
          flag?: string
        ) => {
          if (key.startsWith('nonce_lock:') && flag === 'NX') {
            mockRedis.store[key] = value;
            return 'OK';
          }
          mockRedis.store[key] = value;
          return 'OK';
        }
      );
      mockRedis.get = jest.fn(async (key: string) => {
        if (key.startsWith('nonce_lock:')) {
          // Return a DIFFERENT value to simulate someone else took the lock
          return 'different-owner';
        }
        return mockRedis.store[key] || null;
      });

      await nonceManager.getNextNonce(walletAddress, mockProvider as any);

      // Should NOT have deleted the lock since we don't own it anymore
      expect(mockRedis.del).not.toHaveBeenCalledWith(
        `nonce_lock:${walletAddress}`
      );
    });
  });

  describe('confirmNonce', () => {
    it('should update the tracked nonce in Redis', async () => {
      const walletAddress = '0xconfirmwallet';

      await nonceManager.confirmNonce(walletAddress, 42);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `nonce:${walletAddress}`,
        '42'
      );
    });

    it('should overwrite any existing tracked nonce', async () => {
      const walletAddress = '0xoverwrite';
      mockRedis.store[`nonce:${walletAddress}`] = '10';

      await nonceManager.confirmNonce(walletAddress, 15);

      expect(mockRedis.store[`nonce:${walletAddress}`]).toBe('15');
    });
  });

  describe('releaseNonce', () => {
    it('should roll back tracked nonce when it matches the released nonce', async () => {
      const walletAddress = '0xreleasewallet';
      mockRedis.store[`nonce:${walletAddress}`] = '5';

      await nonceManager.releaseNonce(walletAddress, 5);

      // Should have set nonce to 4 (one less)
      expect(mockRedis.set).toHaveBeenCalledWith(
        `nonce:${walletAddress}`,
        '4'
      );
    });

    it('should delete tracked nonce when releasing nonce 0', async () => {
      const walletAddress = '0xreleasezero';
      mockRedis.store[`nonce:${walletAddress}`] = '0';

      await nonceManager.releaseNonce(walletAddress, 0);

      expect(mockRedis.del).toHaveBeenCalledWith(`nonce:${walletAddress}`);
    });

    it('should not roll back if tracked nonce has already advanced', async () => {
      const walletAddress = '0xadvanced';
      mockRedis.store[`nonce:${walletAddress}`] = '10';

      // Try to release nonce 5, but tracked is already at 10
      await nonceManager.releaseNonce(walletAddress, 5);

      // Should NOT have changed the tracked nonce
      expect(mockRedis.store[`nonce:${walletAddress}`]).toBe('10');
    });

    it('should not error when no tracked nonce exists', async () => {
      const walletAddress = '0xnotracked';

      await expect(
        nonceManager.releaseNonce(walletAddress, 3)
      ).resolves.not.toThrow();
    });
  });

  describe('resetNonce', () => {
    it('should delete the tracked nonce from Redis', async () => {
      const walletAddress = '0xresetwallet';
      mockRedis.store[`nonce:${walletAddress}`] = '5';

      await nonceManager.resetNonce(walletAddress);

      expect(mockRedis.del).toHaveBeenCalledWith(`nonce:${walletAddress}`);
    });

    it('should not error when resetting non-existent nonce', async () => {
      const walletAddress = '0xnoexist';

      await expect(
        nonceManager.resetNonce(walletAddress)
      ).resolves.not.toThrow();
    });
  });

  describe('nonce tracking across calls', () => {
    it('RISK-061: released nonce is reused by the next caller', async () => {
      const walletAddress = '0xrisk061';
      const mockProvider = createMockProvider(0);

      // First call: get nonce 0
      const nonce1 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce1).toBe(0);

      // Transaction fails before broadcast — release the nonce
      await nonceManager.releaseNonce(walletAddress, 0);

      // Next call should get nonce 0 again (not 1)
      const nonce2 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce2).toBe(0);
    });

    it('RISK-061: confirmed nonce is NOT reused by the next caller', async () => {
      const walletAddress = '0xrisk061confirmed';
      const mockProvider = createMockProvider(0);

      // First call: get nonce 0
      const nonce1 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce1).toBe(0);

      // Transaction succeeded on-chain — confirm the nonce
      await nonceManager.confirmNonce(walletAddress, 0);

      // Next call should get nonce 1 (not 0)
      const nonce2 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce2).toBe(1);
    });

    it('should increment nonce across sequential calls', async () => {
      const walletAddress = '0xsequential';
      const mockProvider = createMockProvider(0);

      const nonce1 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce1).toBe(0);

      // After first call, tracked nonce is 0, so next should be max(network=0, tracked+1=1) = 1
      const nonce2 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce2).toBe(1);

      const nonce3 = await nonceManager.getNextNonce(
        walletAddress,
        mockProvider as any
      );
      expect(nonce3).toBe(2);
    });
  });
});
