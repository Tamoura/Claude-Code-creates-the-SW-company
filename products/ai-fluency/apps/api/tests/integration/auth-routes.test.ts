/**
 * tests/integration/auth-routes.test.ts — Auth route stub tests
 *
 * TDD: Tests written FIRST. Implementation in src/routes/auth.ts.
 *
 * Tests cover:
 * [BACKEND-AUTH][AC-1] POST /api/v1/auth/register returns 501 (not yet implemented)
 * [BACKEND-AUTH][AC-2] POST /api/v1/auth/login returns 501 (not yet implemented)
 * [BACKEND-AUTH][AC-3] Responses use RFC 7807 Problem Details format
 *
 * Uses real Fastify app — NO mocks, per company No Mocks Policy.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-AUTH] Auth Route Stubs', () => {
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

  test('[BACKEND-AUTH][AC-1] POST /api/v1/auth/register returns 501', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.statusCode).toBe(501);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/register returns RFC 7807 shape', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 501);
    expect(body).toHaveProperty('detail');
  });

  test('[BACKEND-AUTH][AC-1] POST /api/v1/auth/register detail mentions Sprint 1.4', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
    });

    const body = response.json();
    expect(body.detail).toMatch(/Sprint 1\.4/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-2] POST /api/v1/auth/login returns 501', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.statusCode).toBe(501);
  });

  test('[BACKEND-AUTH][AC-3] POST /api/v1/auth/login returns RFC 7807 shape', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'Test123!' },
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 501);
    expect(body).toHaveProperty('detail');
  });

  test('[BACKEND-AUTH][AC-2] POST /api/v1/auth/login detail mentions Sprint 1.4', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
    });

    const body = response.json();
    expect(body.detail).toMatch(/Sprint 1\.4/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RFC 7807 type field validation
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-AUTH][AC-3] register type field is a valid URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
    });

    const body = response.json();
    expect(() => new URL(body.type)).not.toThrow();
  });

  test('[BACKEND-AUTH][AC-3] login type field is a valid URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
    });

    const body = response.json();
    expect(() => new URL(body.type)).not.toThrow();
  });
});
