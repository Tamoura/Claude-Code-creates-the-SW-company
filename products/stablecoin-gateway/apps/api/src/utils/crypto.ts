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
 * Falls back to plain SHA-256 only if API_KEY_HMAC_SECRET is not set
 * (development/test environments). Production should always have the secret.
 */
export function hashApiKey(apiKey: string): string {
  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  if (hmacSecret) {
    return crypto.createHmac('sha256', hmacSecret).update(apiKey).digest('hex');
  }
  // SEC: In production, HMAC secret is mandatory — fail hard
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API_KEY_HMAC_SECRET must be configured in production'
    );
  }
  // Fallback for dev/test - plain SHA-256
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey(prefix: 'sk_live' | 'sk_test' = 'sk_live'): string {
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

  // timingSafeEqual requires buffers of same length
  // If lengths differ, signature is definitely invalid
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    // If buffer creation fails or lengths mismatch, signature is invalid
    return false;
  }
}

export function generatePaymentSessionId(): string {
  return 'ps_' + crypto.randomBytes(16).toString('hex');
}

export function generateRefundId(): string {
  return 'ref_' + crypto.randomBytes(16).toString('hex');
}
