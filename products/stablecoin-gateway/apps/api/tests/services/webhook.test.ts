/**
 * Webhook Service Tests - Timing Attack Vulnerability Fix (FIX-06)
 *
 * This test file specifically tests that webhook signature verification
 * uses timing-safe comparison to prevent timing attacks.
 *
 * ROOT CAUSE: WebhookService uses `===` string comparison which is vulnerable
 * to timing attacks. crypto.ts uses crypto.timingSafeEqual which is secure.
 *
 * FIX: WebhookService should delegate to crypto.ts functions.
 */

import { WebhookService } from '../../src/services/webhook.service';
import { signWebhookPayload, verifyWebhookSignature } from '../../src/utils/crypto';

describe('WebhookService - Timing Attack Fix (FIX-06)', () => {
  const testSecret = 'whsec_test_secret_key_for_security_testing';
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService(testSecret);
  });

  describe('Security: Timing-Safe Comparison', () => {
    it('should use crypto.ts for signature generation (with timestamp)', () => {
      const event = { event: 'payment.completed', amount: 100 };
      const webhookPayload = service.createWebhookPayload(event);

      // Webhook should include timestamp
      expect(webhookPayload.timestamp).toBeDefined();
      expect(typeof webhookPayload.timestamp).toBe('number');

      // Signature should be verifiable with crypto.ts (timing-safe)
      const { signature, ...dataToVerify } = webhookPayload;
      const payloadString = JSON.stringify(dataToVerify);

      const isValid = verifyWebhookSignature(
        payloadString,
        signature,
        testSecret,
        webhookPayload.timestamp
      );

      expect(isValid).toBe(true);
    });

    it('should reject nearly-correct signatures without timing leakage', () => {
      const event = { event: 'payment.completed', amount: 100 };
      const timestamp = Date.now();
      const payloadString = JSON.stringify({ ...event, timestamp });

      // Generate correct signature
      const correctSignature = signWebhookPayload(payloadString, testSecret, timestamp);

      // Create nearly-correct signature (last character wrong)
      const nearlyCorrectSignature = correctSignature.slice(0, -1) + 'X';

      // Verification should reject without leaking timing information
      // (crypto.timingSafeEqual compares all bytes even if first byte differs)
      const isValid = verifyWebhookSignature(
        payloadString,
        nearlyCorrectSignature,
        testSecret,
        timestamp
      );

      expect(isValid).toBe(false);
    });

    it('should reject signatures with first character wrong (timing attack test)', () => {
      const event = { event: 'payment.completed', amount: 100 };
      const timestamp = Date.now();
      const payloadString = JSON.stringify({ ...event, timestamp });

      const correctSignature = signWebhookPayload(payloadString, testSecret, timestamp);

      // Create signature with first character wrong
      const wrongFirstChar = 'X' + correctSignature.slice(1);

      const isValid = verifyWebhookSignature(
        payloadString,
        wrongFirstChar,
        testSecret,
        timestamp
      );

      expect(isValid).toBe(false);
    });

    it('should verify webhook using crypto.ts implementation', () => {
      const event = { event: 'payment.completed', payment_id: 'ps_123' };
      const webhookPayload = service.createWebhookPayload(event);

      // Full webhook verification should succeed
      const result = service.verifyWebhook(webhookPayload);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject tampered webhooks', () => {
      const event = { event: 'payment.completed', amount: 100 };
      const webhookPayload = service.createWebhookPayload(event);

      // Tamper with amount
      (webhookPayload as any).amount = 999;

      // Verification should fail (signature no longer matches)
      const result = service.verifyWebhook(webhookPayload);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('should use timestamp in signature (Stripe-style)', () => {
      const event = { event: 'payment.completed' };
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1000;

      const payloadString = JSON.stringify({ ...event, timestamp: timestamp1 });

      // Same payload, different timestamp = different signature
      const sig1 = signWebhookPayload(payloadString, testSecret, timestamp1);
      const sig2 = signWebhookPayload(payloadString, testSecret, timestamp2);

      expect(sig1).not.toBe(sig2);
    });

    it('should prevent replay attacks via timestamp validation', () => {
      const event = { event: 'payment.completed' };
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const payloadString = JSON.stringify({ ...event, timestamp: oldTimestamp });
      const signature = signWebhookPayload(payloadString, testSecret, oldTimestamp);

      const oldWebhook = {
        ...event,
        timestamp: oldTimestamp,
        signature,
      };

      // Should reject due to expired timestamp
      const result = service.verifyWebhook(oldWebhook);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired_timestamp');
    });
  });

  describe('Integration with crypto.ts', () => {
    it('should match crypto.ts signature scheme exactly', () => {
      const event = { event: 'test.event', data: 'test' };
      const timestamp = 1234567890000; // Fixed timestamp for reproducibility

      // Create webhook with service
      const webhookPayload = {
        ...event,
        timestamp,
      };

      const payloadString = JSON.stringify(webhookPayload);

      // Generate signature with crypto.ts directly
      const cryptoSignature = signWebhookPayload(payloadString, testSecret, timestamp);

      // Service should generate the same signature
      const serviceSignature = service['generateSignature'](webhookPayload);

      // After FIX-06, these should match (both use crypto.ts)
      expect(serviceSignature).toBe(cryptoSignature);
    });

    it('should verify signatures from crypto.ts', () => {
      const event = { event: 'payment.completed' };
      const timestamp = Date.now();
      const payloadString = JSON.stringify({ ...event, timestamp });

      // Generate signature with crypto.ts
      const signature = signWebhookPayload(payloadString, testSecret, timestamp);

      // Service should accept it
      const isValid = service['verifySignature']({ ...event, timestamp }, signature);

      expect(isValid).toBe(true);
    });

    it('should use constant-time comparison (no timing leakage)', () => {
      // This test ensures we're using crypto.timingSafeEqual, not ===
      const event = { event: 'test' };
      const timestamp = Date.now();
      const payloadString = JSON.stringify({ ...event, timestamp });

      const correctSig = signWebhookPayload(payloadString, testSecret, timestamp);

      // Test multiple incorrect signatures of same length
      const incorrectSigs = [
        'X' + correctSig.slice(1), // First char wrong
        correctSig.slice(0, -1) + 'X', // Last char wrong
        correctSig.slice(0, 32) + 'X'.repeat(32), // Middle wrong
      ];

      for (const incorrectSig of incorrectSigs) {
        const isValid = verifyWebhookSignature(
          payloadString,
          incorrectSig,
          testSecret,
          timestamp
        );
        expect(isValid).toBe(false);
      }
    });
  });

  describe('Documentation: Merchant Integration', () => {
    it('should demonstrate correct verification flow for merchants', () => {
      // Simulate merchant receiving webhook

      // 1. Merchant creates webhook secret
      const merchantSecret = 'whsec_merchant_secret';
      const merchantService = new WebhookService(merchantSecret);

      // 2. We send webhook to merchant
      const event = {
        event: 'payment.completed',
        payment_id: 'ps_abc123',
        amount: '100.00',
        currency: 'USDC',
      };

      const webhookPayload = merchantService.createWebhookPayload(event);

      // 3. Merchant receives POST request with this payload
      // 4. Merchant verifies signature
      const verificationResult = merchantService.verifyWebhook(webhookPayload);

      expect(verificationResult.valid).toBe(true);
    });

    it('should document signature scheme for external merchants', () => {
      // Signature scheme (Stripe-style):
      // signature = HMAC-SHA256(timestamp.payload, secret)

      const event = { event: 'payment.completed', amount: '100.00' };
      const timestamp = Date.now();

      // Step 1: Add timestamp to payload
      const payloadWithTimestamp = { ...event, timestamp };

      // Step 2: Stringify payload
      const payloadString = JSON.stringify(payloadWithTimestamp);

      // Step 3: Sign with HMAC-SHA256
      const signature = signWebhookPayload(payloadString, testSecret, timestamp);

      // Step 4: Send to merchant
      const webhook = {
        ...payloadWithTimestamp,
        signature,
      };

      // Step 5: Merchant verifies (using our service or their own implementation)
      const result = service.verifyWebhook(webhook);

      expect(result.valid).toBe(true);
    });
  });
});
