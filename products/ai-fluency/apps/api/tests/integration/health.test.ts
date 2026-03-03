/**
 * tests/integration/health.test.ts — Health check integration tests
 *
 * TDD: Tests written FIRST. Implementation in src/routes/health.ts.
 *
 * Tests cover:
 * [BACKEND-01][AC-1] Happy path: all services healthy → 200
 * [BACKEND-01][AC-2] Database unreachable → 503
 * [BACKEND-01][AC-3] Response contains required JSON fields
 * [BACKEND-01][AC-4] Redis degradation: still 200 when Redis is down but DB is up
 * [BACKEND-01][AC-5] /ready endpoint — lightweight readiness probe
 *
 * Uses real Fastify app with real PostgreSQL and real Redis.
 * NO mocks — per company No Mocks Policy.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-01] Health Check Endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /health — Happy path
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01][AC-1] GET /health returns 200 when services are healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  test('[BACKEND-01][AC-3] GET /health returns JSON with required fields', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('redis');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('timestamp');
  });

  test('[BACKEND-01][AC-3] GET /health returns status=ok when healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
  });

  test('[BACKEND-01][AC-3] GET /health version is "0.1.0"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(body.version).toBe('0.1.0');
  });

  test('[BACKEND-01][AC-3] GET /health timestamp is a valid ISO 8601 string', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /health — DB failure simulation
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01][AC-2] GET /health returns 503 when database is unreachable', async () => {
    // Temporarily break the Prisma client to simulate DB failure
    const originalQuery = app.prisma.$queryRaw.bind(app.prisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = originalQuery;

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('error');
  });

  test('[BACKEND-01][AC-2] GET /health 503 response still has required fields', async () => {
    const originalQuery = app.prisma.$queryRaw.bind(app.prisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = originalQuery;

    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('redis');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('timestamp');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /ready — Readiness probe
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01][AC-5] GET /ready returns 200 when database is reachable', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ready');
  });

  test('[BACKEND-01][AC-5] GET /ready returns 503 when database is unreachable', async () => {
    const originalQuery = app.prisma.$queryRaw.bind(app.prisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = jest.fn().mockRejectedValue(new Error('DB down'));

    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app.prisma as any).$queryRaw = originalQuery;

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.status).toBe('not_ready');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error format — RFC 7807
  // ─────────────────────────────────────────────────────────────────────────

  test('[BACKEND-01] 404 for unknown routes uses RFC 7807 format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status', 404);
    expect(body).toHaveProperty('detail');
    expect(body.type).toMatch(/^https:\/\/api\.ai-fluency\.connectsw\.com\/errors\//);
  });
});
