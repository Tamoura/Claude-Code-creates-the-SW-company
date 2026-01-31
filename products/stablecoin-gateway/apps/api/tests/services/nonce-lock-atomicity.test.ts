/**
 * Nonce Lock Atomicity Tests
 *
 * Verifies that the NonceManager releases its Redis distributed lock
 * using an atomic Lua compare-and-delete script, preventing the
 * TOCTOU race condition where:
 *   1. Process A reads lock value (matches)
 *   2. Lock expires, Process B acquires lock
 *   3. Process A deletes the lock -- now belonging to Process B
 *
 * Test cases:
 * 1. Lock is released atomically via redis.eval after getNextNonce
 * 2. Lock owned by another process is NOT released
 * 3. Falls back to non-atomic release when eval throws
 * 4. Full acquire-and-release flow works correctly
 */

import { NonceManager } from '../../src/services/nonce-manager.service';

/**
 * Creates a mock Redis client that supports eval and tracks calls.
 * The eval implementation simulates the Lua compare-and-delete:
 *   if GET KEYS[1] == ARGV[1] then DEL KEYS[1] return 1 end return 0
 */
function createMockRedisWithEval() {
  const store: Record<string, string> = {};
  const calls: { method: string; args: any[] }[] = [];

  return {
    store,
    calls,
    set: jest.fn(
      async (
        key: string,
        value: string,
        _mode?: string,
        _duration?: number,
        flag?: string
      ) => {
        calls.push({ method: 'set', args: [key, value, _mode, _duration, flag] });
        if (flag === 'NX' && store[key]) {
          return null;
        }
        store[key] = value;
        return 'OK';
      }
    ),
    get: jest.fn(async (key: string) => {
      calls.push({ method: 'get', args: [key] });
      return store[key] || null;
    }),
    del: jest.fn(async (key: string) => {
      calls.push({ method: 'del', args: [key] });
      delete store[key];
      return 1;
    }),
    eval: jest.fn(
      async (script: string, numkeys: number, ...args: (string | number)[]) => {
        calls.push({ method: 'eval', args: [script, numkeys, ...args] });
        // Simulate atomic compare-and-delete Lua script
        const lockKey = args[0] as string;
        const expectedValue = args[1] as string;
        if (store[lockKey] === expectedValue) {
          delete store[lockKey];
          return 1;
        }
        return 0;
      }
    ),
  };
}

/**
 * Creates a mock Redis where eval always throws, to test fallback.
 */
function createMockRedisWithBrokenEval() {
  const store: Record<string, string> = {};
  const calls: { method: string; args: any[] }[] = [];

  return {
    store,
    calls,
    set: jest.fn(
      async (
        key: string,
        value: string,
        _mode?: string,
        _duration?: number,
        flag?: string
      ) => {
        calls.push({ method: 'set', args: [key, value, _mode, _duration, flag] });
        if (flag === 'NX' && store[key]) {
          return null;
        }
        store[key] = value;
        return 'OK';
      }
    ),
    get: jest.fn(async (key: string) => {
      calls.push({ method: 'get', args: [key] });
      return store[key] || null;
    }),
    del: jest.fn(async (key: string) => {
      calls.push({ method: 'del', args: [key] });
      delete store[key];
      return 1;
    }),
    eval: jest.fn(async () => {
      calls.push({ method: 'eval', args: [] });
      throw new Error('ERR unknown command `EVAL`');
    }),
  };
}

/** Mock ethers provider */
function createMockProvider(pendingNonce: number) {
  return {
    getTransactionCount: jest.fn(async () => pendingNonce),
  };
}

describe('NonceManager - Lock Atomicity (TOCTOU Fix)', () => {
  // -----------------------------------------------------------------------
  // Test 1: eval is called with the Lua compare-and-delete script
  // -----------------------------------------------------------------------
  it('should release lock atomically using Lua script', async () => {
    const redis = createMockRedisWithEval();
    const nonceManager = new NonceManager(redis as any, 5000);
    const mockProvider = createMockProvider(0);
    const walletAddress = '0xatomic_release';

    await nonceManager.getNextNonce(walletAddress, mockProvider as any);

    // eval should have been called for the lock release
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(1);

    // The script should contain GET, DEL -- the compare-and-delete pattern
    const scriptArg = evalCalls[0].args[0] as string;
    expect(scriptArg).toContain('GET');
    expect(scriptArg).toContain('DEL');

    // The key argument should be the lock key
    expect(evalCalls[0].args[2]).toBe(`nonce_lock:${walletAddress}`);

    // Lock should be gone from store after release
    expect(redis.store[`nonce_lock:${walletAddress}`]).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Test 2: Lock owned by another process is NOT released
  // -----------------------------------------------------------------------
  it('should not release lock owned by another process', async () => {
    const redis = createMockRedisWithEval();
    const nonceManager = new NonceManager(redis as any, 5000);
    const mockProvider = createMockProvider(0);
    const walletAddress = '0xother_owner';

    // Override set to capture the lock value then swap ownership
    let capturedLockValue: string | null = null;
    const originalSet = redis.set;
    redis.set = jest.fn(
      async (
        key: string,
        value: string,
        mode?: string,
        duration?: number,
        flag?: string
      ) => {
        const result = await originalSet(key, value, mode, duration, flag);
        if (key === `nonce_lock:${walletAddress}` && flag === 'NX') {
          capturedLockValue = value;
          // Simulate lock expiry + re-acquire by another process
          redis.store[key] = 'different-owner-value';
        }
        return result;
      }
    );

    await nonceManager.getNextNonce(walletAddress, mockProvider as any);

    // eval was called (atomic attempt)
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(1);

    // The lock should still be in the store with the other owner's value
    // because the Lua script saw a mismatch and returned 0
    expect(redis.store[`nonce_lock:${walletAddress}`]).toBe(
      'different-owner-value'
    );
  });

  // -----------------------------------------------------------------------
  // Test 3: Falls back to non-atomic release when eval throws
  // -----------------------------------------------------------------------
  it('should fall back to non-atomic release if eval fails', async () => {
    const redis = createMockRedisWithBrokenEval();
    const nonceManager = new NonceManager(redis as any, 5000);
    const mockProvider = createMockProvider(0);
    const walletAddress = '0xeval_fails';

    await nonceManager.getNextNonce(walletAddress, mockProvider as any);

    // eval was attempted and failed
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(1);

    // Fallback: get was called to check lock ownership
    const getCalls = redis.calls.filter(
      (c) => c.method === 'get' && c.args[0] === `nonce_lock:${walletAddress}`
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(1);

    // Fallback: del was called to release the lock
    const delCalls = redis.calls.filter(
      (c) => c.method === 'del' && c.args[0] === `nonce_lock:${walletAddress}`
    );
    expect(delCalls.length).toBe(1);

    // Lock should be released despite eval failure
    expect(redis.store[`nonce_lock:${walletAddress}`]).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Test 4: Full acquire-and-release flow works correctly
  // -----------------------------------------------------------------------
  it('should acquire and release lock correctly in normal flow', async () => {
    const redis = createMockRedisWithEval();
    const nonceManager = new NonceManager(redis as any, 5000);
    const mockProvider = createMockProvider(5);
    const walletAddress = '0xfull_flow';

    const nonce = await nonceManager.getNextNonce(
      walletAddress,
      mockProvider as any
    );

    // Nonce should be correct
    expect(nonce).toBe(5);

    // Lock should have been acquired with NX
    expect(redis.set).toHaveBeenCalledWith(
      `nonce_lock:${walletAddress}`,
      expect.any(String),
      'PX',
      5000,
      'NX'
    );

    // Lock should be released (not in store)
    expect(redis.store[`nonce_lock:${walletAddress}`]).toBeUndefined();

    // eval was used for release (not plain del)
    const evalCalls = redis.calls.filter((c) => c.method === 'eval');
    expect(evalCalls.length).toBe(1);

    // Nonce should be stored
    expect(redis.store[`nonce:${walletAddress}`]).toBe('5');
  });
});
