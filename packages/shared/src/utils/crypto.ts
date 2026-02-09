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
 *
 * HMAC prevents rainbow table attacks without the performance cost of bcrypt.
 * API keys need fast hash lookups (called on every authenticated request),
 * so bcrypt is not appropriate here.
 *
 * Falls back to plain SHA-256 only in dev/test when hmacSecret is not provided.
 * In production, missing secret throws an error.
 */
export function hashApiKey(apiKey: string, hmacSecret?: string): string {
  const secret = hmacSecret || process.env.API_KEY_HMAC_SECRET;
  if (secret) {
    return crypto.createHmac('sha256', secret).update(apiKey).digest('hex');
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

export function generateApiKey(prefix = 'sk_live'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16) + '...';
}

export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

export function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number
): boolean {
  const expectedSignature = signWebhookPayload(payload, secret, timestamp);

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a prefixed random ID (e.g., 'ps_abc123', 'ref_abc123').
 * Use this for domain-specific IDs in your product.
 */
export function generatePrefixedId(prefix: string, bytes = 16): string {
  return `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;
}
