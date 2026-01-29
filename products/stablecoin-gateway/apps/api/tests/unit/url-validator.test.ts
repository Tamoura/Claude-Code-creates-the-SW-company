/**
 * URL Validator Tests
 *
 * Tests SSRF protection for webhook URLs:
 * - Block internal IP ranges
 * - Block cloud metadata endpoints
 * - Only allow HTTPS URLs to public internet
 * - Block localhost and private networks
 */

import { validateWebhookUrl } from '../../src/utils/url-validator';

describe('URL Validator - SSRF Protection', () => {
  describe('Valid public URLs', () => {
    it('should allow valid HTTPS public URLs', () => {
      expect(() => validateWebhookUrl('https://example.com/webhook')).not.toThrow();
      expect(() => validateWebhookUrl('https://api.merchant.com/webhooks')).not.toThrow();
      expect(() =>
        validateWebhookUrl('https://webhooks.example.com:8443/events')
      ).not.toThrow();
    });

    it('should allow URLs with query parameters', () => {
      expect(() =>
        validateWebhookUrl('https://example.com/webhook?token=abc123')
      ).not.toThrow();
    });

    it('should allow URLs with paths', () => {
      expect(() =>
        validateWebhookUrl('https://example.com/api/v1/webhooks/payment')
      ).not.toThrow();
    });
  });

  describe('Localhost blocking', () => {
    it('should block localhost variations', () => {
      expect(() => validateWebhookUrl('https://localhost/webhook')).toThrow(
        'Webhook URL cannot target localhost or internal networks'
      );
      expect(() => validateWebhookUrl('https://localhost:8080/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://127.0.0.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://127.0.0.1:8080/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://127.1.1.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://0.0.0.0/webhook')).toThrow();
    });
  });

  describe('Private network blocking', () => {
    it('should block 10.x.x.x range', () => {
      expect(() => validateWebhookUrl('https://10.0.0.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://10.1.2.3/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://10.255.255.255/webhook')).toThrow();
    });

    it('should block 192.168.x.x range', () => {
      expect(() => validateWebhookUrl('https://192.168.0.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://192.168.1.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://192.168.255.255/webhook')).toThrow();
    });

    it('should block 172.16.x.x - 172.31.x.x range', () => {
      expect(() => validateWebhookUrl('https://172.16.0.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://172.20.10.5/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://172.31.255.255/webhook')).toThrow();
    });
  });

  describe('Cloud metadata blocking', () => {
    it('should block AWS metadata endpoint', () => {
      expect(() => validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).toThrow(
        'Webhook URL cannot target cloud metadata endpoints'
      );
      expect(() => validateWebhookUrl('https://169.254.169.254/')).toThrow();
    });

    it('should block link-local addresses (169.254.x.x)', () => {
      expect(() => validateWebhookUrl('https://169.254.1.1/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://169.254.255.255/webhook')).toThrow();
    });
  });

  describe('Protocol enforcement', () => {
    it('should reject HTTP URLs (require HTTPS)', () => {
      expect(() => validateWebhookUrl('http://example.com/webhook')).toThrow(
        'Webhook URL must use HTTPS protocol'
      );
      expect(() => validateWebhookUrl('http://api.example.com/webhook')).toThrow();
    });

    it('should reject non-HTTP protocols', () => {
      expect(() => validateWebhookUrl('ftp://example.com/webhook')).toThrow();
      expect(() => validateWebhookUrl('file:///etc/passwd')).toThrow();
      expect(() => validateWebhookUrl('javascript:alert(1)')).toThrow();
    });
  });

  describe('Invalid URLs', () => {
    it('should reject malformed URLs', () => {
      expect(() => validateWebhookUrl('not-a-url')).toThrow('Invalid webhook URL format');
      expect(() => validateWebhookUrl('')).toThrow();
      expect(() => validateWebhookUrl('https://')).toThrow();
    });

    it('should reject URLs with only slashes as hostname', () => {
      // Note: https:///webhook actually parses as https://webhook/ so it's valid
      // A truly empty hostname would be caught by the URL parser itself
      expect(() => validateWebhookUrl('https://:8080/webhook')).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should block IPv6 localhost', () => {
      expect(() => validateWebhookUrl('https://[::1]/webhook')).toThrow();
      expect(() => validateWebhookUrl('https://[0:0:0:0:0:0:0:1]/webhook')).toThrow();
    });

    it('should block localhost-like domains', () => {
      expect(() => validateWebhookUrl('https://localhost.localdomain/webhook')).toThrow();
    });

    it('should handle URLs with authentication', () => {
      // While technically valid, URLs with credentials are suspicious
      expect(() => validateWebhookUrl('https://user:pass@example.com/webhook')).toThrow(
        'Webhook URL cannot contain credentials'
      );
    });
  });

  describe('DNS rebinding protection', () => {
    it('should reject URLs that resolve to IP addresses directly', () => {
      // Note: This test validates the format, actual DNS resolution would be done at runtime
      expect(() => validateWebhookUrl('https://10.0.0.1/webhook')).toThrow();
    });
  });
});
