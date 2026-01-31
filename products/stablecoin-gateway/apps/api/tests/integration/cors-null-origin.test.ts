import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('CORS null/missing origin handling', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('production environment', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      process.env.NODE_ENV = 'production';
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should reject preflight request with no Origin header', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/v1/payment-sessions',
        headers: {
          'access-control-request-method': 'POST',
        },
      });

      // In production, preflight without Origin must be blocked
      expect(response.statusCode).not.toBe(204);
      const allowOrigin = response.headers['access-control-allow-origin'];
      expect(allowOrigin).toBeUndefined();
    });

    it('should allow request with valid allowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:3101' },
      });

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3101'
      );
      expect(response.statusCode).toBe(200);
    });

    it('should reject request with disallowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'https://evil.example.com' },
      });

      const allowOrigin = response.headers['access-control-allow-origin'];
      expect(allowOrigin).not.toBe('https://evil.example.com');
    });
  });

  describe('dev/test environment', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should allow request with no Origin header (backward compatible)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
