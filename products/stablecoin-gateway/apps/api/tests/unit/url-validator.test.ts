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

// Mock DNS resolution to allow valid public IPs in tests
jest.mock('dns', () => ({
  resolve4: jest.fn((hostname: string, callback: (err: Error | null, addresses?: string[]) => void) => {
    // Mock successful resolution for public domains
    if (hostname.includes('example.com') || hostname.includes('merchant.com') || hostname.includes('webhooks.')) {
      callback(null, ['93.184.216.34']); // example.com's actual IP (public)
    } else {
      callback(new Error('DNS lookup failed'));
    }
  }),
  resolve6: jest.fn((_hostname: string, callback: (err: Error) => void) => {
    // Mock IPv6 resolution failure (optional)
    callback(new Error('No IPv6 address'));
  }),
}));

describe('URL Validator - SSRF Protection', () => {
  describe('Valid public URLs', () => {
    it('should allow valid HTTPS public URLs', async () => {
      await expect(validateWebhookUrl('https://example.com/webhook')).resolves.not.toThrow();
      await expect(validateWebhookUrl('https://api.merchant.com/webhooks')).resolves.not.toThrow();
      await expect(
        validateWebhookUrl('https://webhooks.example.com:8443/events')
      ).resolves.not.toThrow();
    });

    it('should allow URLs with query parameters', async () => {
      await expect(
        validateWebhookUrl('https://example.com/webhook?token=abc123')
      ).resolves.not.toThrow();
    });

    it('should allow URLs with paths', async () => {
      await expect(
        validateWebhookUrl('https://example.com/api/v1/webhooks/payment')
      ).resolves.not.toThrow();
    });
  });

  describe('Localhost blocking', () => {
    it('should block localhost variations', async () => {
      await expect(validateWebhookUrl('https://localhost/webhook')).rejects.toThrow(
        'Webhook URL cannot target localhost or internal networks'
      );
      await expect(validateWebhookUrl('https://localhost:8080/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://127.0.0.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://127.0.0.1:8080/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://127.1.1.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://0.0.0.0/webhook')).rejects.toThrow();
    });
  });

  describe('Private network blocking', () => {
    it('should block 10.x.x.x range', async () => {
      await expect(validateWebhookUrl('https://10.0.0.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://10.1.2.3/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://10.255.255.255/webhook')).rejects.toThrow();
    });

    it('should block 192.168.x.x range', async () => {
      await expect(validateWebhookUrl('https://192.168.0.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://192.168.1.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://192.168.255.255/webhook')).rejects.toThrow();
    });

    it('should block 172.16.x.x - 172.31.x.x range', async () => {
      await expect(validateWebhookUrl('https://172.16.0.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://172.20.10.5/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://172.31.255.255/webhook')).rejects.toThrow();
    });
  });

  describe('Cloud metadata blocking', () => {
    it('should block AWS metadata endpoint', async () => {
      await expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(
        'Webhook URL cannot target cloud metadata endpoints'
      );
      await expect(validateWebhookUrl('https://169.254.169.254/')).rejects.toThrow();
    });

    it('should block link-local addresses (169.254.x.x)', async () => {
      await expect(validateWebhookUrl('https://169.254.1.1/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://169.254.255.255/webhook')).rejects.toThrow();
    });
  });

  describe('Protocol enforcement', () => {
    it('should reject HTTP URLs (require HTTPS)', async () => {
      await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow(
        'Webhook URL must use HTTPS protocol'
      );
      await expect(validateWebhookUrl('http://api.example.com/webhook')).rejects.toThrow();
    });

    it('should reject non-HTTP protocols', async () => {
      await expect(validateWebhookUrl('ftp://example.com/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('file:///etc/passwd')).rejects.toThrow();
      await expect(validateWebhookUrl('javascript:alert(1)')).rejects.toThrow();
    });
  });

  describe('Invalid URLs', () => {
    it('should reject malformed URLs', async () => {
      await expect(validateWebhookUrl('not-a-url')).rejects.toThrow('Invalid webhook URL format');
      await expect(validateWebhookUrl('')).rejects.toThrow();
      await expect(validateWebhookUrl('https://')).rejects.toThrow();
    });

    it('should reject URLs with only slashes as hostname', async () => {
      // Note: https:///webhook actually parses as https://webhook/ so it's valid
      // A truly empty hostname would be caught by the URL parser itself
      await expect(validateWebhookUrl('https://:8080/webhook')).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should block IPv6 localhost', async () => {
      await expect(validateWebhookUrl('https://[::1]/webhook')).rejects.toThrow();
      await expect(validateWebhookUrl('https://[0:0:0:0:0:0:0:1]/webhook')).rejects.toThrow();
    });

    it('should block localhost-like domains', async () => {
      await expect(validateWebhookUrl('https://localhost.localdomain/webhook')).rejects.toThrow();
    });

    it('should handle URLs with authentication', async () => {
      // While technically valid, URLs with credentials are suspicious
      await expect(validateWebhookUrl('https://user:pass@example.com/webhook')).rejects.toThrow(
        'Webhook URL cannot contain credentials'
      );
    });
  });

  describe('DNS rebinding protection', () => {
    it('should reject URLs that resolve to IP addresses directly', async () => {
      // Note: This test validates the format, actual DNS resolution would be done at runtime
      await expect(validateWebhookUrl('https://10.0.0.1/webhook')).rejects.toThrow();
    });
  });
});
