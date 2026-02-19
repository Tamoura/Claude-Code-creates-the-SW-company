/**
 * Crypto Utilities for HumanID
 *
 * - Password hashing/verification via bcrypt (12 rounds)
 * - API key hashing via HMAC-SHA256 (fast lookups, rainbow-table resistant)
 * - API key generation with humanid_sk_ / humanid_pk_ prefixes
 * - Document hashing via SHA-256 (for blockchain anchoring)
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
 * HMAC prevents rainbow table attacks without the performance cost of bcrypt.
 * API keys need fast hash lookups (called on every authenticated request),
 * so bcrypt is not appropriate here.
 *
 * Falls back to plain SHA-256 only in dev/test when API_KEY_HMAC_SECRET is
 * not set. In production, missing API_KEY_HMAC_SECRET throws an error.
 */
export function hashApiKey(apiKey: string): string {
  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  if (hmacSecret) {
    return crypto.createHmac('sha256', hmacSecret).update(apiKey).digest('hex');
  }
  // Production must always use HMAC - fail hard
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API_KEY_HMAC_SECRET is required in production. ' +
      'Unsalted SHA-256 fallback is not allowed. ' +
      'Generate a secret: openssl rand -hex 64'
    );
  }
  // Fallback for dev/test only - plain SHA-256
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate an API key with a HumanID-specific prefix.
 *
 * @param prefix - 'sk' for secret keys, 'pk' for publishable keys
 * @returns A prefixed API key string (e.g., humanid_sk_<64 hex chars>)
 */
export function generateApiKey(prefix: 'sk' | 'pk' = 'sk'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `humanid_${prefix}_${randomBytes}`;
}

/**
 * Get the displayable prefix portion of an API key.
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16) + '...';
}

/**
 * Hash document content using SHA-256 for blockchain anchoring.
 *
 * Used to create deterministic hashes of credentials, DID documents,
 * and other data that gets anchored on-chain.
 */
export function hashDocument(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
