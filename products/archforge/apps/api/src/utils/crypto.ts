/**
 * Crypto Utilities for ArchForge
 *
 * - Password hashing/verification via bcrypt (12 rounds)
 * - API key hashing via HMAC-SHA256 (fast lookups, rainbow-table resistant)
 * - API key generation with archforge_sk_ / archforge_pk_ prefixes
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt with 12 rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash an API key using HMAC-SHA-256 with a server-side secret.
 *
 * Falls back to plain SHA-256 only in dev/test when API_KEY_HMAC_SECRET is
 * not set. In production, missing API_KEY_HMAC_SECRET throws an error.
 */
export function hashApiKey(apiKey: string): string {
  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  if (hmacSecret) {
    return crypto.createHmac('sha256', hmacSecret).update(apiKey).digest('hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API_KEY_HMAC_SECRET is required in production. ' +
      'Unsalted SHA-256 fallback is not allowed. ' +
      'Generate a secret: openssl rand -hex 64'
    );
  }
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate an API key with an ArchForge-specific prefix.
 *
 * @param prefix - 'sk' for secret keys, 'pk' for publishable keys
 * @returns A prefixed API key string (e.g., archforge_sk_<64 hex chars>)
 */
export function generateApiKey(prefix: 'sk' | 'pk' = 'sk'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `archforge_${prefix}_${randomBytes}`;
}

/**
 * Get the displayable prefix portion of an API key.
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 18) + '...';
}
