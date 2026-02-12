import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-helpers';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.version).toBe('1.0.0');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const res = await app.inject({ method: 'GET', url: '/ready' });
      const body = JSON.parse(res.body);

      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.redis).toBeDefined();
    });
  });
});
