/**
 * tests/integration/auth-routes.test.ts — Auth route validation tests
 *
 * Tests that auth routes exist and return proper error codes on invalid input.
 * Full endpoint behavior tested in auth-endpoints.test.ts.
 *
 * Uses real Fastify app — NO mocks, per company No Mocks Policy.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-AUTH] Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/register — validation
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-1] POST /api/v1/auth/register returns 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.statusCode).toBe(400);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/register error contains error info', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    // Error response includes status code and descriptive message
    expect(response.statusCode).toBe(400);
    expect(body).toHaveProperty('message');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login — validation
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-2] POST /api/v1/auth/login returns 400 for missing fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/login error contains error info', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com' },
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(response.statusCode).toBe(400);
    expect(body).toHaveProperty('message');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/auth/me — requires authentication
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH] GET /api/v1/auth/me returns 401 without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });
});
