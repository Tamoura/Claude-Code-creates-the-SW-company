/**
 * tests/integration/auth-routes.test.ts — Auth route stub tests
 *
 * Tests that /api/v1/auth/register and /api/v1/auth/login:
 * - Respond with 501 Not Implemented (Sprint 1 stub)
 * - Return RFC 7807 problem-details JSON (not 404, not HTML)
 * - Accept POST method with JSON body
 *
 * [HIGH-002] Auth routes must be registered and return structured responses
 *
 * Full implementation planned for Sprint 1.4 (PRO-AUTH-01 through PRO-AUTH-05).
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[HIGH-002] Auth Routes — Stub Endpoints', () => {
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

  test('[HIGH-002] POST /api/v1/auth/register returns 501 (not 404)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'test@example.com', password: 'Secret123!', firstName: 'Test', lastName: 'User' },
    });

    // Must NOT be 404 — route must exist
    expect(response.statusCode).not.toBe(404);
    expect(response.statusCode).toBe(501);
  });

  test('[HIGH-002] POST /api/v1/auth/register returns RFC 7807 JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 501);
    expect(body).toHaveProperty('detail');
    expect(body.type).toMatch(/^https:\/\/api\.ai-fluency\.connectsw\.com\/errors\//);
  });

  test('[HIGH-002] POST /api/v1/auth/register accepts empty body without crashing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
    });

    expect([400, 501]).toContain(response.statusCode);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────────────────────

  test('[HIGH-002] POST /api/v1/auth/login returns 501 (not 404)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'Secret123!' },
    });

    // Must NOT be 404 — route must exist
    expect(response.statusCode).not.toBe(404);
    expect(response.statusCode).toBe(501);
  });

  test('[HIGH-002] POST /api/v1/auth/login returns RFC 7807 JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 501);
    expect(body).toHaveProperty('detail');
    expect(body.type).toMatch(/^https:\/\/api\.ai-fluency\.connectsw\.com\/errors\//);
  });

  test('[HIGH-002] POST /api/v1/auth/login detail mentions planned sprint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    const body = response.json();
    // The stub should communicate when this will be implemented
    expect(body.detail).toContain('Sprint');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Security headers — helmet must be registered
  // ─────────────────────────────────────────────────────────────────────────

  test('[HIGH-001] auth routes include X-Frame-Options security header (helmet)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    // helmet adds X-Frame-Options by default
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  test('[HIGH-001] auth routes include X-Content-Type-Options security header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
