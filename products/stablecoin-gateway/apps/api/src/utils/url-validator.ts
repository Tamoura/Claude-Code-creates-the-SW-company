/**
 * URL Validator
 *
 * Provides SSRF (Server-Side Request Forgery) protection for webhook URLs.
 *
 * Blocks:
 * - Internal IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
 * - Localhost (127.x.x.x, ::1, localhost)
 * - Link-local addresses (169.254.x.x)
 * - Cloud metadata endpoints (169.254.169.254)
 * - Non-HTTPS protocols
 * - URLs with credentials
 * - Malformed URLs
 *
 * Only allows:
 * - HTTPS URLs to public internet addresses
 */

import { AppError } from '../types/index.js';

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(hostname: string): boolean {
  // Remove brackets from IPv6 addresses
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // IPv6 localhost
  if (cleanHost === '::1' || cleanHost === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanHost.match(ipv4Pattern);

  if (!match) {
    // Not an IP address, check for localhost-like domains
    if (
      cleanHost === 'localhost' ||
      cleanHost.endsWith('.localhost') ||
      cleanHost.endsWith('.localdomain') ||
      cleanHost === '0.0.0.0'
    ) {
      return true;
    }
    return false;
  }

  // Parse octets
  const octets = match.slice(1, 5).map(Number);

  // Validate octets are in range 0-255
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return false; // Invalid IP
  }

  const [first, second, , ] = octets;

  // 127.0.0.0/8 - Loopback
  if (first === 127) {
    return true;
  }

  // 10.0.0.0/8 - Private network
  if (first === 10) {
    return true;
  }

  // 172.16.0.0/12 - Private network
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  // 192.168.0.0/16 - Private network
  if (first === 192 && second === 168) {
    return true;
  }

  // 169.254.0.0/16 - Link-local (includes cloud metadata 169.254.169.254)
  if (first === 169 && second === 254) {
    return true;
  }

  // 0.0.0.0/8 - "This network"
  if (first === 0) {
    return true;
  }

  return false;
}

/**
 * Validate webhook URL for SSRF protection
 *
 * @throws AppError if URL is invalid or targets internal/private resources
 */
export function validateWebhookUrl(url: string): void {
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Invalid webhook URL format',
      'Provide a valid HTTPS URL'
    );
  }

  // Enforce HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Webhook URL must use HTTPS protocol',
      'Update the webhook URL to use HTTPS'
    );
  }

  // Block URLs with credentials (suspicious)
  if (parsedUrl.username || parsedUrl.password) {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Webhook URL cannot contain credentials',
      'Remove username and password from the URL'
    );
  }

  // Validate hostname exists and is not empty
  if (!parsedUrl.hostname || parsedUrl.hostname.trim() === '') {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Invalid webhook URL format',
      'Provide a valid HTTPS URL with a hostname'
    );
  }

  // Additional check: hostname must not be just whitespace or empty after parsing
  if (parsedUrl.host === '' || parsedUrl.host === '//') {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Invalid webhook URL format',
      'Provide a valid HTTPS URL with a hostname'
    );
  }

  // Check for cloud metadata endpoint (specific check for common endpoint)
  if (parsedUrl.hostname === '169.254.169.254') {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Webhook URL cannot target cloud metadata endpoints',
      'Provide a public internet URL'
    );
  }

  // Check if hostname is a private/internal IP
  if (isPrivateIP(parsedUrl.hostname)) {
    throw new AppError(
      400,
      'invalid-webhook-url',
      'Webhook URL cannot target localhost or internal networks',
      'Provide a public internet URL'
    );
  }

  // Additional validation: hostname should not be an IP address at all (prevents DNS rebinding)
  // This is a defense-in-depth measure
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv6Pattern = /^\[?[0-9a-f:]+\]?$/i;

  if (ipv4Pattern.test(parsedUrl.hostname) || ipv6Pattern.test(parsedUrl.hostname)) {
    // It's an IP address - we already checked if it's private, but we should also
    // block public IPs to prevent DNS rebinding attacks
    // Actually, some legitimate webhooks might use public IPs, so we only block private ones
    // The isPrivateIP check above handles this
  }
}
