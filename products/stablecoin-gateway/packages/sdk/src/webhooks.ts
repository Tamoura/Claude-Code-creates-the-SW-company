import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_HEADER = 'x-webhook-signature';
const TIMESTAMP_HEADER = 'x-webhook-timestamp';
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

export function constructWebhookEvent(
  payload: string,
  headers: Record<string, string | undefined>,
  secret: string,
): unknown {
  const signature = headers[SIGNATURE_HEADER];
  const timestamp = headers[TIMESTAMP_HEADER];

  if (!signature) {
    throw new Error('Missing webhook signature header');
  }

  if (!timestamp) {
    throw new Error('Missing webhook timestamp header');
  }

  const timestampMs = parseInt(timestamp, 10);
  if (isNaN(timestampMs)) {
    throw new Error('Invalid webhook timestamp');
  }

  const age = Date.now() - timestampMs;
  if (age > MAX_TIMESTAMP_AGE_MS) {
    throw new Error('Webhook timestamp too old');
  }

  const signedPayload = `${timestamp}.${payload}`;
  if (!verifyWebhookSignature(signedPayload, signature, secret)) {
    throw new Error('Invalid webhook signature');
  }

  return JSON.parse(payload);
}
