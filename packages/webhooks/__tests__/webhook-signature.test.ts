import {
  signWebhookPayload,
  verifyWebhookSignature,
  WebhookSignatureService,
} from '../src/backend/services/webhook-signature.service';

describe('signWebhookPayload', () => {
  it('produces a hex string signature', () => {
    const sig = signWebhookPayload('{"event":"test"}', 'secret', Date.now());
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent signatures for same inputs', () => {
    const ts = 1700000000000;
    const sig1 = signWebhookPayload('payload', 'secret', ts);
    const sig2 = signWebhookPayload('payload', 'secret', ts);
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different payloads', () => {
    const ts = 1700000000000;
    const sig1 = signWebhookPayload('payload-one', 'secret', ts);
    const sig2 = signWebhookPayload('payload-two', 'secret', ts);
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different timestamps', () => {
    const sig1 = signWebhookPayload('payload', 'secret', 1000);
    const sig2 = signWebhookPayload('payload', 'secret', 2000);
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifyWebhookSignature', () => {
  it('returns true for a valid signature', () => {
    const payload = 'test-payload';
    const secret = 'my-secret';
    const timestamp = Date.now();
    const sig = signWebhookPayload(payload, secret, timestamp);
    expect(verifyWebhookSignature(payload, sig, secret, timestamp)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const timestamp = Date.now();
    expect(verifyWebhookSignature('payload', 'invalid-sig', 'secret', timestamp)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const timestamp = Date.now();
    const sig = signWebhookPayload('payload', 'correct-secret', timestamp);
    expect(verifyWebhookSignature('payload', sig, 'wrong-secret', timestamp)).toBe(false);
  });

  it('returns false for length mismatch', () => {
    const timestamp = Date.now();
    expect(verifyWebhookSignature('payload', 'short', 'secret', timestamp)).toBe(false);
  });
});

describe('WebhookSignatureService', () => {
  let service: WebhookSignatureService;

  beforeEach(() => {
    service = new WebhookSignatureService('test-webhook-secret');
  });

  describe('createSignedPayload', () => {
    it('adds timestamp and signature to payload', () => {
      const result = service.createSignedPayload({ event: 'payment.completed', id: 'pay_123' });
      expect(result.timestamp).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.event).toBe('payment.completed');
    });

    it('timestamp is approximately now', () => {
      const before = Date.now();
      const result = service.createSignedPayload({ event: 'test' });
      const after = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('verifyWebhook', () => {
    it('returns valid: true for a freshly signed payload', () => {
      const signed = service.createSignedPayload({ event: 'order.created', orderId: '123' });
      const result = service.verifyWebhook(signed);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns missing_signature error when signature absent', () => {
      const result = service.verifyWebhook({ event: 'test', timestamp: Date.now() });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_signature');
    });

    it('returns missing_timestamp error when timestamp absent', () => {
      const result = service.verifyWebhook({ event: 'test', signature: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_timestamp');
    });

    it('returns expired_timestamp for old payload', () => {
      const service2 = new WebhookSignatureService('secret', 100); // 100ms tolerance
      const oldTs = Date.now() - 60000; // 1 minute ago
      const sig = signWebhookPayload('{"event":"test"}', 'secret', oldTs);
      const result = service2.verifyWebhook({ event: 'test', timestamp: oldTs, signature: sig });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired_timestamp');
    });

    it('returns invalid_signature for tampered payload', () => {
      const signed = service.createSignedPayload({ event: 'order.created' });
      const tampered = { ...signed, event: 'order.cancelled' };
      const result = service.verifyWebhook(tampered);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });
  });

  describe('isTimestampValid', () => {
    it('returns true for current timestamp', () => {
      expect(service.isTimestampValid(Date.now())).toBe(true);
    });

    it('returns false for timestamp too old', () => {
      const veryOld = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      expect(service.isTimestampValid(veryOld)).toBe(false);
    });

    it('returns false for future timestamp', () => {
      expect(service.isTimestampValid(Date.now() + 1000)).toBe(false);
    });
  });
});
