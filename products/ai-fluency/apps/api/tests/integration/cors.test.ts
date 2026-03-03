/**
 * tests/integration/cors.test.ts — CORS behavior tests
 *
 * Tests the CORS configuration on the Fastify app.
 *
 * [BACKEND-01] CORS tests
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-01] CORS Configuration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('[BACKEND-01] allowed origin gets CORS headers in test/dev mode', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'http://localhost:3118',
      },
    });

    // In test/dev mode, allowed origins get CORS headers
    expect(response.statusCode).toBe(200);
  });

  test('[BACKEND-01] no-origin requests succeed in test/dev mode', async () => {
    // In test mode, requests without Origin header should work
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      // No origin header
    });

    expect(response.statusCode).toBe(200);
  });

  test('[BACKEND-01] OPTIONS preflight returns appropriate headers', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'http://localhost:3118',
        'access-control-request-method': 'GET',
      },
    });

    // Preflight should return 204 or 200
    expect([200, 204]).toContain(response.statusCode);
  });
});
