import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyWebhookSignature, constructWebhookEvent } from '../src/webhooks';

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_secret_key';
  const payload = '{"event":"payment.completed","data":{"id":"ps_1"}}';

  function sign(data: string, key: string): string {
    return createHmac('sha256', key).update(data).digest('hex');
  }

  it('returns true for valid signature', () => {
    const signature = sign(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyWebhookSignature(payload, 'deadbeef'.repeat(8), secret)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const signature = sign(payload, secret);
    expect(verifyWebhookSignature(payload, signature, 'wrong_secret')).toBe(false);
  });

  it('returns false for tampered payload', () => {
    const signature = sign(payload, secret);
    const tampered = payload.replace('ps_1', 'ps_2');
    expect(verifyWebhookSignature(tampered, signature, secret)).toBe(false);
  });

  it('returns false for signature with wrong length', () => {
    expect(verifyWebhookSignature(payload, 'abc', secret)).toBe(false);
  });
});

describe('constructWebhookEvent', () => {
  const secret = 'whsec_test_secret';
  const payload = '{"event":"payment.completed"}';

  function signWithTimestamp(data: string, timestamp: number, key: string): string {
    return createHmac('sha256', key).update(`${timestamp}.${data}`).digest('hex');
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs event from valid webhook', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const signature = signWithTimestamp(payload, now, secret);

    const event = constructWebhookEvent(
      payload,
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': String(now),
      },
      secret,
    );

    expect(event).toEqual({ event: 'payment.completed' });
  });

  it('throws on missing signature header', () => {
    expect(() =>
      constructWebhookEvent(payload, { 'x-webhook-timestamp': '123' }, secret),
    ).toThrow('Missing webhook signature header');
  });

  it('throws on missing timestamp header', () => {
    expect(() =>
      constructWebhookEvent(payload, { 'x-webhook-signature': 'abc' }, secret),
    ).toThrow('Missing webhook timestamp header');
  });

  it('throws on invalid timestamp', () => {
    expect(() =>
      constructWebhookEvent(
        payload,
        { 'x-webhook-signature': 'abc', 'x-webhook-timestamp': 'notanumber' },
        secret,
      ),
    ).toThrow('Invalid webhook timestamp');
  });

  it('throws on expired timestamp', () => {
    const fiveMinAgo = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const signature = signWithTimestamp(payload, fiveMinAgo, secret);

    expect(() =>
      constructWebhookEvent(
        payload,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': String(fiveMinAgo),
        },
        secret,
      ),
    ).toThrow('Webhook timestamp too old');
  });

  it('throws on invalid signature', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(() =>
      constructWebhookEvent(
        payload,
        {
          'x-webhook-signature': 'a'.repeat(64),
          'x-webhook-timestamp': String(now),
        },
        secret,
      ),
    ).toThrow('Invalid webhook signature');
  });
});
