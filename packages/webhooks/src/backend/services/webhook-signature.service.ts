/**
 * Webhook Signature Service
 *
 * HMAC-SHA256 signing/verification with timing-safe comparison
 * and replay attack prevention via timestamp validation.
 */

import crypto from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  error?: 'missing_signature' | 'missing_timestamp' | 'expired_timestamp' | 'invalid_signature';
}

export function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
): boolean {
  const expected = signWebhookPayload(payload, secret, timestamp);

  if (signature.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export class WebhookSignatureService {
  private readonly secret: string;
  private readonly timestampToleranceMs: number;

  constructor(secret: string, toleranceMs = 5 * 60 * 1000) {
    this.secret = secret;
    this.timestampToleranceMs = toleranceMs;
  }

  generateSignature(payload: Record<string, unknown>): string {
    if (!('timestamp' in payload)) throw new Error('Payload must include timestamp');
    return signWebhookPayload(JSON.stringify(payload), this.secret, payload.timestamp as number);
  }

  verifySignature(payload: Record<string, unknown>, signature: string): boolean {
    if (!('timestamp' in payload)) return false;
    return verifyWebhookSignature(JSON.stringify(payload), signature, this.secret, payload.timestamp as number);
  }

  isTimestampValid(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age >= 0 && age <= this.timestampToleranceMs;
  }

  createSignedPayload<T extends Record<string, unknown>>(event: T): T & { timestamp: number; signature: string } {
    const timestamp = Date.now();
    const withTs = { ...event, timestamp };
    const signature = this.generateSignature(withTs);
    return { ...withTs, signature };
  }

  verifyWebhook(payload: Record<string, unknown> & { signature?: string; timestamp?: number }): WebhookVerificationResult {
    if (!payload.signature) return { valid: false, error: 'missing_signature' };
    if (!payload.timestamp) return { valid: false, error: 'missing_timestamp' };
    if (!this.isTimestampValid(payload.timestamp)) return { valid: false, error: 'expired_timestamp' };

    const { signature, ...data } = payload;
    if (!this.verifySignature(data, signature)) return { valid: false, error: 'invalid_signature' };

    return { valid: true };
  }
}
