import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  generateWebhookSignature,
} from './webhooks';
import { WebhookSignatureError } from './errors';

describe('Webhook utilities', () => {
  const SECRET = 'whsec_test_secret_key_12345';
  const PAYLOAD = JSON.stringify({
    id: 'evt_test123',
    type: 'payment.completed',
    data: { id: 'ps_test123', status: 'COMPLETED' },
    created_at: '2025-01-01T00:00:00Z',
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(PAYLOAD, SECRET, timestamp);

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
      expect(signature).toContain(`t=${timestamp}`);
    });

    it('should use current timestamp if not provided', () => {
      const before = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(PAYLOAD, SECRET);
      const after = Math.floor(Date.now() / 1000);

      const match = signature.match(/t=(\d+)/);
      expect(match).not.toBeNull();

      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(PAYLOAD, SECRET, timestamp);

      expect(verifyWebhookSignature(PAYLOAD, signature, SECRET)).toBe(true);
    });

    it('should throw for invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidSignature = `t=${timestamp},v1=invalidsignature`;

      expect(() =>
        verifyWebhookSignature(PAYLOAD, invalidSignature, SECRET)
      ).toThrow(WebhookSignatureError);
    });

    it('should throw for missing parameters', () => {
      expect(() => verifyWebhookSignature('', 't=123,v1=abc', SECRET)).toThrow(
        WebhookSignatureError
      );
      expect(() => verifyWebhookSignature(PAYLOAD, '', SECRET)).toThrow(
        WebhookSignatureError
      );
      expect(() =>
        verifyWebhookSignature(PAYLOAD, 't=123,v1=abc', '')
      ).toThrow(WebhookSignatureError);
    });

    it('should throw for malformed signature header', () => {
      expect(() =>
        verifyWebhookSignature(PAYLOAD, 'invalid-format', SECRET)
      ).toThrow(WebhookSignatureError);
      expect(() =>
        verifyWebhookSignature(PAYLOAD, 't=123', SECRET)
      ).toThrow(WebhookSignatureError);
      expect(() =>
        verifyWebhookSignature(PAYLOAD, 'v1=abc', SECRET)
      ).toThrow(WebhookSignatureError);
    });

    it('should throw for expired timestamp', () => {
      // Timestamp from 10 minutes ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = generateWebhookSignature(PAYLOAD, SECRET, oldTimestamp);

      expect(() =>
        verifyWebhookSignature(PAYLOAD, signature, SECRET)
      ).toThrow(WebhookSignatureError);
      expect(() =>
        verifyWebhookSignature(PAYLOAD, signature, SECRET)
      ).toThrow(/too old/);
    });

    it('should allow custom tolerance', () => {
      // Timestamp from 10 minutes ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = generateWebhookSignature(PAYLOAD, SECRET, oldTimestamp);

      // With 15 minute tolerance, it should pass
      expect(
        verifyWebhookSignature(PAYLOAD, signature, SECRET, 900)
      ).toBe(true);
    });

    it('should throw for wrong secret', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(PAYLOAD, SECRET, timestamp);

      expect(() =>
        verifyWebhookSignature(PAYLOAD, signature, 'wrong-secret')
      ).toThrow(WebhookSignatureError);
    });

    it('should throw for tampered payload', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(PAYLOAD, SECRET, timestamp);
      const tamperedPayload = PAYLOAD.replace('COMPLETED', 'FAILED');

      expect(() =>
        verifyWebhookSignature(tamperedPayload, signature, SECRET)
      ).toThrow(WebhookSignatureError);
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid JSON payload', () => {
      const event = parseWebhookPayload(PAYLOAD);

      expect(event.id).toBe('evt_test123');
      expect(event.type).toBe('payment.completed');
      expect(event.data).toEqual({ id: 'ps_test123', status: 'COMPLETED' });
    });

    it('should throw for invalid JSON', () => {
      expect(() => parseWebhookPayload('not-json')).toThrow(
        WebhookSignatureError
      );
      expect(() => parseWebhookPayload('{invalid')).toThrow(
        WebhookSignatureError
      );
    });

    it('should parse complex webhook payloads', () => {
      const complexPayload = JSON.stringify({
        id: 'evt_complex',
        type: 'refund.completed',
        data: {
          id: 'ref_test123',
          payment_id: 'ps_test123',
          amount: 50,
          currency: 'USD',
          status: 'COMPLETED',
          reason: 'Customer request',
          tx_hash: '0x123abc',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        created_at: '2025-01-02T00:00:00Z',
      });

      const event = parseWebhookPayload(complexPayload);

      expect(event.type).toBe('refund.completed');
      expect(event.data.id).toBe('ref_test123');
    });
  });

  describe('end-to-end signature verification', () => {
    it('should work with full webhook flow', () => {
      // Server generates signature
      const timestamp = Math.floor(Date.now() / 1000);
      const serverPayload = JSON.stringify({
        id: 'evt_123',
        type: 'payment.completed',
        data: { id: 'ps_123', status: 'COMPLETED', amount: 100 },
        created_at: new Date().toISOString(),
      });
      const signature = generateWebhookSignature(
        serverPayload,
        SECRET,
        timestamp
      );

      // Client verifies signature
      expect(verifyWebhookSignature(serverPayload, signature, SECRET)).toBe(
        true
      );

      // Client parses payload
      const event = parseWebhookPayload(serverPayload);
      expect(event.type).toBe('payment.completed');
      expect(event.data.amount).toBe(100);
    });
  });
});
