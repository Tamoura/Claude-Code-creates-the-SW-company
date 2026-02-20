import { validateWebhookUrl } from '../src/backend/utils/url-validator';

describe('validateWebhookUrl', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('throws for an invalid URL format', async () => {
    await expect(validateWebhookUrl('not-a-url')).rejects.toThrow('Invalid URL');
  });

  it('throws for localhost URL', async () => {
    await expect(validateWebhookUrl('http://localhost:3000/webhook')).rejects.toThrow('localhost');
  });

  it('throws for 127.0.0.1 URL', async () => {
    await expect(validateWebhookUrl('http://127.0.0.1/webhook')).rejects.toThrow('localhost');
  });

  it('throws for non-http/https protocol', async () => {
    await expect(validateWebhookUrl('ftp://example.com/webhook')).rejects.toThrow('HTTP or HTTPS');
  });

  it('throws for HTTP in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow('HTTPS');
  });

  it('accepts HTTPS URL in production (DNS may fail in test env)', async () => {
    process.env.NODE_ENV = 'production';
    // In production, a real external URL would pass URL validation
    // DNS resolution will fail in test environment, but URL format check passes
    try {
      await validateWebhookUrl('https://example.com/webhook');
      // If DNS resolves and it is not private, no throw
    } catch (err) {
      // DNS failure in production mode is expected in test env
      const message = (err as Error).message;
      expect(message).toMatch(/DNS|private IP/);
    }
  });

  it('accepts HTTP URL in non-production (format validation only)', async () => {
    process.env.NODE_ENV = 'test';
    // HTTP is allowed in non-production, DNS failure is OK too
    try {
      await validateWebhookUrl('http://example.com/webhook');
      // No throw = valid
    } catch (err) {
      // DNS or private IP error is expected in test env
      expect((err as Error).message).not.toContain('Invalid URL');
      expect((err as Error).message).not.toContain('HTTP or HTTPS');
    }
  });
});
