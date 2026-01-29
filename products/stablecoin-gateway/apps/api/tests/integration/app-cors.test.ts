import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('CORS Configuration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Set multiple allowed origins for testing
    process.env.ALLOWED_ORIGINS = 'http://localhost:3101,http://localhost:3102,https://gateway.io';
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.ALLOWED_ORIGINS;
  });

  describe('Origin Validation', () => {
    it('should accept requests from first allowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3101',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3101');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should accept requests from second allowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3102',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3102');
    });

    it('should accept requests from production origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'https://gateway.io',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://gateway.io');
    });

    it('should reject requests from disallowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'https://evil.com',
        },
      });

      // CORS rejection doesn't change status code, but no CORS headers
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should accept requests with no origin (e.g., Postman, mobile apps)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      // No origin header = no CORS headers needed
    });

    it('should handle whitespace in ALLOWED_ORIGINS env var', async () => {
      // Test with a new app instance that has whitespace in config
      const originalEnv = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'http://localhost:3101 , http://localhost:3102 , https://gateway.io';

      const testApp = await buildApp();

      const response = await testApp.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3102',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3102');

      await testApp.close();
      process.env.ALLOWED_ORIGINS = originalEnv;
    });
  });

  describe('Credentials Support', () => {
    it('should include credentials header for allowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3101',
        },
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS preflight request', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/v1/payment-sessions',
        headers: {
          origin: 'http://localhost:3101',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,authorization',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3101');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});
