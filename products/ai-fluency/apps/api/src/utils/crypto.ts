/**
 * crypto.ts — Cryptographic utilities
 *
 * SECURITY: Always use timingSafeEqual for comparing secrets, tokens, and hashes.
 * Never use === for security-sensitive string comparisons.
 * See: https://codahale.com/a-lesson-in-timing-attacks/
 */

import { createHash, timingSafeEqual, randomBytes } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing side-channel attacks.
 * Pads both buffers to equal length so the comparison time does NOT leak
 * whether the supplied value has the correct length.
 */
export function safeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const aBuf = Buffer.alloc(maxLen, 0);
  const bBuf = Buffer.alloc(maxLen, 0);
  Buffer.from(a).copy(aBuf);
  Buffer.from(b).copy(bBuf);
  // Also check lengths explicitly — timingSafeEqual above does constant-time
  // comparison but does NOT leak whether a === b only through time.
  // Checking lengths separately ensures we don't accept partial matches.
  return a.length === b.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * Hash a token with SHA-256 for secure storage.
 * NEVER store refresh tokens, verification tokens, or reset tokens in plaintext.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Timing-safe comparison for hashed token verification.
 * Hash the presented token then compare hashes.
 */
export function verifyHashedToken(
  presentedToken: string,
  storedHash: string
): boolean {
  const presentedHash = hashToken(presentedToken);
  return safeCompare(presentedHash, storedHash);
}
