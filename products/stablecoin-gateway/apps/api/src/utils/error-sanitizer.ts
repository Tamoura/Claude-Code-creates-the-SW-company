/**
 * Error Sanitizer
 *
 * Strips sensitive infrastructure details from error messages
 * before they are sent to external parties via webhooks.
 *
 * Redacts:
 * - URLs (http/https)
 * - AWS ARNs
 * - Database/Redis connection strings
 * - IP:port patterns
 */

const SANITIZATION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Connection strings (postgresql://, redis://, mysql://, etc.)
  // Must come before generic URL pattern
  {
    pattern: /(?:postgresql|postgres|redis|mysql|mongodb|amqp):\/\/\S+/gi,
    replacement: '[REDACTED_CONNECTION_STRING]',
  },
  // AWS ARNs
  {
    pattern: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[^\s,)]+/gi,
    replacement: '[REDACTED_ARN]',
  },
  // HTTP/HTTPS URLs
  {
    pattern: /https?:\/\/\S+/gi,
    replacement: '[REDACTED_URL]',
  },
  // IP:port patterns (e.g. 10.0.1.50:8545)
  {
    pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/g,
    replacement: '[REDACTED_IP]',
  },
];

/**
 * Sanitize an error message for inclusion in webhook payloads.
 *
 * Strips URLs, ARNs, connection strings, and IP:port patterns
 * that could leak internal infrastructure details to merchants.
 */
export function sanitizeErrorForWebhook(error: string | undefined | null): string {
  if (error == null) {
    return 'An error occurred';
  }

  let sanitized = error;
  for (const rule of SANITIZATION_RULES) {
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }
  return sanitized;
}
