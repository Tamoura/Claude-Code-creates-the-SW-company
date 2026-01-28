/**
 * Webhook Service
 *
 * Handles webhook delivery with HMAC signature verification
 * and replay attack prevention via timestamp validation.
 */

import { createHmac } from 'crypto';

export interface WebhookPayload {
  [key: string]: any;
  timestamp: number;
  signature: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: 'missing_signature' | 'missing_timestamp' | 'expired_timestamp' | 'invalid_signature';
}

/**
 * Service for generating and verifying webhook signatures
 */
export class WebhookService {
  private readonly secret: string;
  private readonly timestampToleranceMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  generateSignature(payload: Record<string, any>): string {
    const payloadString = JSON.stringify(payload);
    const hmac = createHmac('sha256', this.secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: Record<string, any>, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload);
    return expectedSignature === signature;
  }

  /**
   * Check if timestamp is within acceptable range (not too old, not in future)
   */
  isTimestampValid(timestamp: number): boolean {
    const now = Date.now();
    const age = now - timestamp;

    // Reject if timestamp is in the future
    if (age < 0) {
      return false;
    }

    // Reject if timestamp is too old (>5 minutes)
    if (age > this.timestampToleranceMs) {
      return false;
    }

    return true;
  }

  /**
   * Create a webhook payload with timestamp and signature
   */
  createWebhookPayload<T extends Record<string, any>>(event: T): T & { timestamp: number; signature: string } {
    const timestamp = Date.now();
    const payloadWithTimestamp = {
      ...event,
      timestamp,
    };

    const signature = this.generateSignature(payloadWithTimestamp);

    return {
      ...payloadWithTimestamp,
      signature,
    };
  }

  /**
   * Verify a complete webhook payload (signature + timestamp)
   */
  verifyWebhook(payload: WebhookPayload): WebhookVerificationResult {
    // Check for required fields
    if (!payload.signature) {
      return { valid: false, error: 'missing_signature' };
    }

    if (!payload.timestamp) {
      return { valid: false, error: 'missing_timestamp' };
    }

    // Verify timestamp is recent
    if (!this.isTimestampValid(payload.timestamp)) {
      return { valid: false, error: 'expired_timestamp' };
    }

    // Extract signature and verify
    const { signature, ...dataToVerify } = payload;
    if (!this.verifySignature(dataToVerify, signature)) {
      return { valid: false, error: 'invalid_signature' };
    }

    return { valid: true };
  }
}
