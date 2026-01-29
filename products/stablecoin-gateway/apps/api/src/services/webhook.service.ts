/**
 * Webhook Service
 *
 * Handles webhook delivery with HMAC signature verification
 * and replay attack prevention via timestamp validation.
 *
 * SECURITY: Uses crypto.ts for timing-safe signature comparison
 * to prevent timing attacks (CWE-208).
 */

import { signWebhookPayload, verifyWebhookSignature } from '../utils/crypto.js';

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
   *
   * Uses crypto.ts signWebhookPayload() which implements Stripe-style
   * signature scheme: HMAC-SHA256(timestamp.payload, secret)
   *
   * @param payload - Webhook payload (must include timestamp field)
   * @returns Hex-encoded signature
   */
  generateSignature(payload: Record<string, any>): string {
    if (!payload.timestamp) {
      throw new Error('Payload must include timestamp for signature generation');
    }

    const payloadString = JSON.stringify(payload);
    return signWebhookPayload(payloadString, this.secret, payload.timestamp);
  }

  /**
   * Verify webhook signature using timing-safe comparison
   *
   * Uses crypto.ts verifyWebhookSignature() which uses crypto.timingSafeEqual
   * to prevent timing attacks (CWE-208: Observable Timing Discrepancy).
   *
   * @param payload - Webhook payload (must include timestamp field)
   * @param signature - Signature to verify
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(payload: Record<string, any>, signature: string): boolean {
    if (!payload.timestamp) {
      return false;
    }

    const payloadString = JSON.stringify(payload);
    return verifyWebhookSignature(payloadString, signature, this.secret, payload.timestamp);
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
