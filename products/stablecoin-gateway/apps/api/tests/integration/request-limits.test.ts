/**
 * Request Limits Tests
 *
 * Verifies that the Fastify server enforces:
 * - maxParamLength: 256 — rejects oversized URL parameters
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Request limits', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation-purposes-1234567890';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject URL parameters longer than 256 characters', async () => {
    const longParam = 'a'.repeat(257);
    const response = await app.inject({
      method: 'GET',
      url: `/v1/refunds/${longParam}`,
    });

    // Fastify returns 404 when maxParamLength is exceeded
    // because the route simply doesn't match
    expect(response.statusCode).toBe(404);
  });

  it('should accept URL parameters at exactly 256 characters', async () => {
    const param256 = 'a'.repeat(256);
    const response = await app.inject({
      method: 'GET',
      url: `/v1/refunds/${param256}`,
    });

    // Should match the route (will be 401 because no auth token)
    // The key assertion: NOT 404 from param length rejection
    expect(response.statusCode).toBe(401);
  });

  it('should accept normal-length URL parameters', async () => {
    const normalParam = 'refund-id-123';
    const response = await app.inject({
      method: 'GET',
      url: `/v1/refunds/${normalParam}`,
    });

    // Matches route, fails auth — not rejected by param length
    expect(response.statusCode).toBe(401);
  });
});
