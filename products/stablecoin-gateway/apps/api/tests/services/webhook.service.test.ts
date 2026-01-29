import { WebhookService } from '../../src/services/webhook.service';

describe('WebhookService', () => {
  const webhookSecret = 'test-webhook-secret-key-1234567890';
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookService = new WebhookService(webhookSecret);
  });

  describe('generateSignature', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        amount: '100.00',
        timestamp: Date.now(),
      };

      const signature = webhookService.generateSignature(payload);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(signature).toMatch(/^[0-9a-f]{64}$/); // SHA256 hex is 64 chars
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: 1000,
      };

      const payload2 = {
        event: 'payment.failed',
        payment_session_id: 'ps_456',
        timestamp: 2000,
      };

      const signature1 = webhookService.generateSignature(payload1);
      const signature2 = webhookService.generateSignature(payload2);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate same signature for same payload', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: 1000,
      };

      const signature1 = webhookService.generateSignature(payload);
      const signature2 = webhookService.generateSignature(payload);

      expect(signature1).toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: Date.now(),
      };

      const signature = webhookService.generateSignature(payload);
      const isValid = webhookService.verifySignature(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: Date.now(),
      };

      const isValid = webhookService.verifySignature(payload, 'invalid-signature');

      expect(isValid).toBe(false);
    });

    it('should reject signature for different payload', () => {
      const payload1 = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: 1000,
      };

      const payload2 = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: 2000,
      };

      const signature = webhookService.generateSignature(payload1);
      const isValid = webhookService.verifySignature(payload2, signature);

      expect(isValid).toBe(false);
    });
  });

  describe('isTimestampValid', () => {
    it('should accept recent timestamp (within 5 minutes)', () => {
      const timestamp = Date.now(); // Now
      const isValid = webhookService.isTimestampValid(timestamp);

      expect(isValid).toBe(true);
    });

    it('should accept timestamp 4 minutes ago', () => {
      const timestamp = Date.now() - (4 * 60 * 1000); // 4 minutes ago
      const isValid = webhookService.isTimestampValid(timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject old timestamp (>5 minutes)', () => {
      const timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const isValid = webhookService.isTimestampValid(timestamp);

      expect(isValid).toBe(false);
    });

    it('should reject future timestamp', () => {
      const timestamp = Date.now() + (2 * 60 * 1000); // 2 minutes in future
      const isValid = webhookService.isTimestampValid(timestamp);

      expect(isValid).toBe(false);
    });
  });

  describe('createWebhookPayload', () => {
    it('should create payload with timestamp and signature', () => {
      const event = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        amount: '100.00',
      };

      const payload = webhookService.createWebhookPayload(event);

      expect(payload.timestamp).toBeDefined();
      expect(payload.signature).toBeDefined();
      expect(payload.event).toBe('payment.completed');
      expect(payload.payment_session_id).toBe('ps_123');
      expect(payload.amount).toBe('100.00');
    });

    it('should create valid timestamp', () => {
      const event = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
      };

      const payload = webhookService.createWebhookPayload(event);
      const now = Date.now();

      expect(payload.timestamp).toBeGreaterThan(now - 1000); // Within last second
      expect(payload.timestamp).toBeLessThanOrEqual(now);
    });

    it('should create verifiable signature', () => {
      const event = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
      };

      const payload = webhookService.createWebhookPayload(event);

      // Remove signature to verify the payload
      const { signature, ...dataToVerify } = payload;
      const isValid = webhookService.verifySignature(dataToVerify, signature);

      expect(isValid).toBe(true);
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook with recent timestamp', () => {
      const event = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
      };

      const payload = webhookService.createWebhookPayload(event);
      const result = webhookService.verifyWebhook(payload);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject webhook with invalid signature', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };

      const result = webhookService.verifyWebhook(payload);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('should reject webhook with old timestamp', () => {
      const event = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
      };

      const payload = webhookService.createWebhookPayload(event);
      // Manually modify timestamp to be old
      payload.timestamp = Date.now() - (6 * 60 * 1000);

      const result = webhookService.verifyWebhook(payload);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired_timestamp');
    });

    it('should reject webhook with missing timestamp', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        signature: 'some-signature',
      } as any;

      const result = webhookService.verifyWebhook(payload);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_timestamp');
    });

    it('should reject webhook with missing signature', () => {
      const payload = {
        event: 'payment.completed',
        payment_session_id: 'ps_123',
        timestamp: Date.now(),
      } as any;

      const result = webhookService.verifyWebhook(payload);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_signature');
    });
  });
});
