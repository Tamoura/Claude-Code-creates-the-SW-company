import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Health Endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return status ok with timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe('string');

      // Verify timestamp is a valid ISO string
      const date = new Date(body.timestamp);
      expect(date.toISOString()).toBe(body.timestamp);
    });

    it('should return version in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      const body = response.json();
      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
    });

    it('should return correct content-type header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/unknown',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
