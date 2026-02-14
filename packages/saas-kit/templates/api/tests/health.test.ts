import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Health Check', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('checks');
    expect(body).toHaveProperty('timestamp');
  });
});
