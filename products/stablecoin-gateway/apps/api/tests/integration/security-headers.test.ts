import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Security Headers', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should include security headers in responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);

    // Check for security headers
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers['x-content-type-options']).toBe('nosniff');

    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');

    expect(response.headers).toHaveProperty('x-xss-protection');
    expect(response.headers['x-xss-protection']).toBe('0');

    expect(response.headers).toHaveProperty('strict-transport-security');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });

  it('should include CSP header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers).toHaveProperty('content-security-policy');
  });

  it('should not expose sensitive headers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    // Should not have X-Powered-By header
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});
