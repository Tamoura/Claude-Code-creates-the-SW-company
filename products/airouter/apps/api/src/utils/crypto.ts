import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash an API key using HMAC-SHA-256 with a server-side secret.
 * Falls back to plain SHA-256 in dev/test when API_KEY_HMAC_SECRET is not set.
 */
export function hashApiKey(apiKey: string): string {
  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  if (hmacSecret) {
    return crypto.createHmac('sha256', hmacSecret).update(apiKey).digest('hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_KEY_HMAC_SECRET is required in production.');
  }
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey(prefix: 'air_live' | 'air_test' = 'air_live'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16) + '...';
}
