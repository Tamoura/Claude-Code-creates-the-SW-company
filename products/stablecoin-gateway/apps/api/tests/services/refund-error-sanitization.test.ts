/**
 * Refund Error Sanitization Tests
 *
 * Verifies that error messages in webhook payloads are sanitized
 * to prevent leaking sensitive infrastructure details like RPC URLs,
 * AWS ARNs, database connection strings, and IP:port patterns.
 */

import { sanitizeErrorForWebhook } from '../../src/utils/error-sanitizer';

describe('sanitizeErrorForWebhook', () => {
  describe('URL stripping', () => {
    it('should redact HTTPS URLs', () => {
      const input = 'Failed to send to https://polygon-rpc.com/v1/abc123';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'Failed to send to [REDACTED_URL]'
      );
    });

    it('should redact HTTP URLs', () => {
      const input = 'Connection refused: http://internal-node:8545/rpc';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'Connection refused: [REDACTED_URL]'
      );
    });

    it('should redact multiple URLs', () => {
      const input = 'Tried https://rpc1.com and https://rpc2.com/path';
      const result = sanitizeErrorForWebhook(input);
      expect(result).not.toContain('rpc1.com');
      expect(result).not.toContain('rpc2.com');
    });
  });

  describe('AWS ARN stripping', () => {
    it('should redact KMS ARNs', () => {
      const input = 'KMS key not found: arn:aws:kms:us-east-1:123456789:key/abc-123';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'KMS key not found: [REDACTED_ARN]'
      );
    });

    it('should redact IAM ARNs', () => {
      const input = 'Access denied for arn:aws:iam::123456789:role/prod-signer';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'Access denied for [REDACTED_ARN]'
      );
    });
  });

  describe('Connection string stripping', () => {
    it('should redact PostgreSQL connection strings', () => {
      const input = 'DB error: postgresql://user:pass@db.internal:5432/gateway';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'DB error: [REDACTED_CONNECTION_STRING]'
      );
    });

    it('should redact Redis connection strings', () => {
      const input = 'Redis timeout: redis://default:secret@redis.internal:6379';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'Redis timeout: [REDACTED_CONNECTION_STRING]'
      );
    });
  });

  describe('IP:port stripping', () => {
    it('should redact IPv4:port patterns', () => {
      const input = 'Connection refused to 10.0.1.50:8545';
      expect(sanitizeErrorForWebhook(input)).toBe(
        'Connection refused to [REDACTED_IP]'
      );
    });

    it('should redact multiple IP:port patterns', () => {
      const input = 'Tried 192.168.1.1:3000 and 10.0.0.1:8080';
      const result = sanitizeErrorForWebhook(input);
      expect(result).not.toContain('192.168.1.1');
      expect(result).not.toContain('10.0.0.1');
    });
  });

  describe('Safe messages preserved', () => {
    it('should preserve simple error messages', () => {
      expect(sanitizeErrorForWebhook('Insufficient balance')).toBe(
        'Insufficient balance'
      );
    });

    it('should preserve refund-related messages', () => {
      expect(sanitizeErrorForWebhook('Refund amount exceeds payment')).toBe(
        'Refund amount exceeds payment'
      );
    });

    it('should preserve unknown error message', () => {
      expect(sanitizeErrorForWebhook('Unknown error')).toBe('Unknown error');
    });

    it('should handle empty string', () => {
      expect(sanitizeErrorForWebhook('')).toBe('');
    });

    it('should handle undefined/null gracefully', () => {
      expect(sanitizeErrorForWebhook(undefined as any)).toBe('An error occurred');
      expect(sanitizeErrorForWebhook(null as any)).toBe('An error occurred');
    });
  });
});
