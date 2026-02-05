/**
 * Nonce Manager Service
 *
 * Manages blockchain transaction nonces using Redis distributed
 * locking to prevent concurrent transactions from using the
 * same nonce.
 *
 * Problem solved:
 * When multiple refund transactions fire concurrently, they can
 * each read the same pending nonce from the blockchain provider,
 * causing transaction failures or replacements. This service
 * serializes nonce acquisition via Redis locks.
 *
 * Features:
 * - Redis distributed lock for nonce serialization
 * - Tracks used nonces to avoid conflicts
 * - Falls back to network pending nonce on first use
 * - Handles nonce gaps by using the higher of network vs tracked
 * - Safe lock release (only the owner can release)
 * - Lock timeout to prevent deadlocks from crashed processes
 */

import { ethers } from 'ethers';
import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export class NonceManager {
  private redis: Redis;
  private lockTimeout: number;

  /**
   * Lua script for atomic compare-and-delete.
   * Only deletes the key if the current value matches the expected value.
   * Prevents TOCTOU race condition where lock expires and is re-acquired
   * by another process between our GET and DEL.
   */
  private static readonly UNLOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

  constructor(redis: Redis, lockTimeout: number = 30000) {
    this.redis = redis;
    this.lockTimeout = lockTimeout;
  }

  /**
   * Get the next available nonce for a wallet address.
   *
   * Acquires a Redis distributed lock, queries the network for
   * the pending nonce, compares with our tracked nonce, and
   * returns the higher value.
   *
   * @param walletAddress - The wallet address to get nonce for
   * @param provider - ethers provider for querying the network
   * @returns The next nonce to use
   * @throws If the lock cannot be acquired or provider fails
   */
  async getNextNonce(
    walletAddress: string,
    provider: ethers.Provider
  ): Promise<number> {
    const lockKey = `nonce_lock:${walletAddress}`;
    const nonceKey = `nonce:${walletAddress}`;

    // Generate a unique lock value so only we can release it
    const lockValue = crypto.randomUUID();

    // Acquire Redis lock with NX (set-if-not-exists) and PX (expiry in ms)
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      this.lockTimeout,
      'NX'
    );

    if (!acquired) {
      throw new Error(
        'Could not acquire nonce lock - another transaction in progress'
      );
    }

    try {
      // Get the pending nonce from the network
      const pendingNonce = await provider.getTransactionCount(
        walletAddress,
        'pending'
      );

      // Get our tracked nonce from Redis
      const trackedNonceStr = await this.redis.get(nonceKey);

      // Use the higher of: network pending nonce, or tracked nonce + 1
      const nonce = Math.max(
        pendingNonce,
        trackedNonceStr ? parseInt(trackedNonceStr, 10) + 1 : pendingNonce
      );

      // Store for next use
      await this.redis.set(nonceKey, nonce.toString());

      logger.info('Nonce acquired', {
        walletAddress,
        nonce,
        pendingNonce,
        trackedNonce: trackedNonceStr,
      });

      return nonce;
    } finally {
      // Atomic compare-and-delete: only release if we still own the lock
      try {
        await this.redis.eval(
          NonceManager.UNLOCK_SCRIPT,
          1,
          lockKey,
          lockValue
        );
      } catch (error) {
        // If eval fails, fall back to non-atomic release (better than leaking lock)
        logger.warn('Lua EVAL failed for nonce lock release, attempting non-atomic fallback', { error });
        const currentValue = await this.redis.get(lockKey);
        if (currentValue === lockValue) {
          await this.redis.del(lockKey);
        }
      }
    }
  }

  /**
   * Confirm that a nonce was successfully used on-chain.
   *
   * Updates the tracked nonce so subsequent calls know this
   * nonce has been consumed.
   *
   * @param walletAddress - The wallet address
   * @param nonce - The nonce that was confirmed on-chain
   */
  async confirmNonce(walletAddress: string, nonce: number): Promise<void> {
    const nonceKey = `nonce:${walletAddress}`;
    await this.redis.set(nonceKey, nonce.toString());

    logger.info('Nonce confirmed', { walletAddress, nonce });
  }

  /**
   * RISK-061: Release a nonce that was never submitted to the network.
   *
   * When a transaction fails BEFORE being broadcast (e.g., gas estimation
   * failure, signing error), the nonce was never consumed on-chain but
   * IS tracked in Redis. This method rolls back the tracked nonce so
   * the next caller can reuse it instead of skipping to nonce+1.
   *
   * IMPORTANT: Only call this when the transaction was NOT broadcast.
   * If the transaction was broadcast but failed on-chain, the nonce IS
   * consumed and should NOT be released.
   *
   * @param walletAddress - The wallet address
   * @param nonce - The nonce to release
   */
  async releaseNonce(walletAddress: string, nonce: number): Promise<void> {
    const nonceKey = `nonce:${walletAddress}`;
    const trackedStr = await this.redis.get(nonceKey);
    const tracked = trackedStr ? parseInt(trackedStr, 10) : null;

    // Only roll back if the tracked nonce matches the one we're releasing.
    // If someone else already advanced it, don't regress.
    if (tracked === nonce) {
      if (nonce > 0) {
        await this.redis.set(nonceKey, (nonce - 1).toString());
      } else {
        await this.redis.del(nonceKey);
      }
      logger.info('Nonce released (not consumed on-chain)', {
        walletAddress,
        releasedNonce: nonce,
      });
    } else {
      logger.warn('Nonce release skipped — tracked nonce already advanced', {
        walletAddress,
        releasedNonce: nonce,
        currentTracked: tracked,
      });
    }
  }

  /**
   * Reset the tracked nonce for a wallet address.
   *
   * Useful when the tracked nonce gets out of sync with the
   * network (e.g., after manual intervention or stuck transactions).
   *
   * @param walletAddress - The wallet address to reset
   */
  async resetNonce(walletAddress: string): Promise<void> {
    const nonceKey = `nonce:${walletAddress}`;
    await this.redis.del(nonceKey);

    logger.info('Nonce reset', { walletAddress });
  }
}
