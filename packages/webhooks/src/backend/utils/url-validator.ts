/**
 * SSRF-safe webhook URL validation.
 *
 * Rejects private/loopback IPs, non-HTTPS in production,
 * and resolves DNS to prevent DNS rebinding attacks.
 */

import { lookup } from 'dns/promises';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

export async function validateWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // HTTPS required in production
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must use HTTPS in production');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Webhook URL must use HTTP or HTTPS');
  }

  const hostname = parsed.hostname;

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    throw new Error('Webhook URL cannot point to localhost');
  }

  // DNS resolve to check for private IPs
  try {
    const result = await lookup(hostname, { all: true });
    for (const entry of result) {
      if (isPrivateIp(entry.address)) {
        throw new Error('Webhook URL resolves to a private IP address');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('private IP')) throw err;
    // DNS resolution failure in dev is OK (might be using docker hostnames)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`DNS resolution failed for ${hostname}`);
    }
  }
}
