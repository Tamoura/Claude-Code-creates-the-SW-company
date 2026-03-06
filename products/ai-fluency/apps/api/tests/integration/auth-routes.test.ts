/**
 * tests/integration/auth-routes.test.ts — Auth routes basic contract tests
 *
 * Verifies auth routes exist and respond with correct formats.
 * Full auth flow tested in auth-full.test.ts.
 *
 * [BACKEND-AUTH] Auth route contract tests
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-AUTH] Auth Route Contracts', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/register
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-1] POST /api/v1/auth/register route exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
    });

    // Should return 400 (validation error), NOT 404
    expect(response.statusCode).not.toBe(404);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/register validation error uses RFC 7807', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'not-valid' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 400);
    expect(body).toHaveProperty('detail');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-2] POST /api/v1/auth/login route exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    // Should return 400 (validation error), NOT 404
    expect(response.statusCode).not.toBe(404);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/login validation error uses RFC 7807', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 400);
    expect(body).toHaveProperty('detail');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RFC 7807 type field validation
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-3] register type field is a valid URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
    });

    const body = response.json();
    expect(() => new URL(body.type)).not.toThrow();
  });

  test('[BACKEND-AUTH][AC-3] login type field is a valid URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    const body = response.json();
    expect(() => new URL(body.type)).not.toThrow();
  });
});
