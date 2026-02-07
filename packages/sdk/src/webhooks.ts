import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookSignatureError } from './errors';
import type { WebhookPayload } from './types';

/**
 * Tolerance window for timestamp validation (5 minutes)
 */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Parsed signature components from the header
 */
interface SignatureComponents {
  timestamp: number;
  signature: string;
}

/**
 * Parse the webhook signature header
 * Format: t=<timestamp>,v1=<signature>
 */
function parseSignatureHeader(header: string): SignatureComponents {
  const parts = header.split(',');
  let timestamp: number | undefined;
  let signature: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = parseInt(value, 10);
    } else if (key === 'v1') {
      signature = value;
    }
  }

  if (!timestamp || !signature) {
    throw new WebhookSignatureError('Invalid signature header format');
  }

  return { timestamp, signature };
}

/**
 * Compute the expected HMAC-SHA256 signature
 */
function computeSignature(
  timestamp: number,
  payload: string,
  secret: string
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac('sha256', secret).update(signedPayload).digest('hex');
}

/**
 * Verify a webhook signature
 *
 * @param payload - The raw webhook payload as a string
 * @param signature - The X-Webhook-Signature header value
 * @param secret - Your webhook secret
 * @param tolerance - Optional timestamp tolerance in seconds (default: 300)
 * @returns true if signature is valid
 * @throws WebhookSignatureError if signature is invalid
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@stablecoin-gateway/sdk';
 *
 * app.post('/webhook', (req, res) => {
 *   const signature = req.headers['x-webhook-signature'];
 *   const isValid = verifyWebhookSignature(
 *     JSON.stringify(req.body),
 *     signature,
 *     process.env.WEBHOOK_SECRET
 *   );
 *
 *   if (!isValid) {
 *     return res.status(401).send('Invalid signature');
 *   }
 *
 *   // Process the webhook
 *   const event = req.body;
 *   // ...
 * });
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = TIMESTAMP_TOLERANCE_SECONDS
): boolean {
  if (!payload || !signature || !secret) {
    throw new WebhookSignatureError('Missing required parameters');
  }

  let components: SignatureComponents;
  try {
    components = parseSignatureHeader(signature);
  } catch {
    throw new WebhookSignatureError('Invalid signature header format');
  }

  const { timestamp, signature: providedSignature } = components;

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > tolerance) {
    throw new WebhookSignatureError(
      `Webhook timestamp is too old (${age}s > ${tolerance}s tolerance)`
    );
  }

  // Compute expected signature
  const expectedSignature = computeSignature(timestamp, payload, secret);

  // Use timing-safe comparison
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(providedSignature, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    throw new WebhookSignatureError('Signature mismatch');
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new WebhookSignatureError('Signature mismatch');
  }

  return true;
}

/**
 * Parse a webhook payload into a typed object
 *
 * @param payload - The raw webhook payload as a string
 * @returns Parsed webhook payload
 *
 * @example
 * ```typescript
 * const event = parseWebhookPayload(req.body);
 *
 * switch (event.type) {
 *   case 'payment.completed':
 *     console.log('Payment completed:', event.data.id);
 *     break;
 *   case 'refund.completed':
 *     console.log('Refund completed:', event.data.id);
 *     break;
 * }
 * ```
 */
export function parseWebhookPayload(payload: string): WebhookPayload {
  try {
    return JSON.parse(payload) as WebhookPayload;
  } catch {
    throw new WebhookSignatureError('Invalid webhook payload JSON');
  }
}

/**
 * Generate a webhook signature (for testing purposes)
 * This is typically only used on the server side
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const sig = computeSignature(ts, payload, secret);
  return `t=${ts},v1=${sig}`;
}
