import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashApiKey(apiKey: string): string {
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
