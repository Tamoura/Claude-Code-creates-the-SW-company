/**
 * Integration test — health + readiness endpoints (T015, NFR-003).
 *
 * Exercises the real Fastify app against a real PostgreSQL test database
 * (no mocks — Article III). Verifies:
 *  - GET /health/live  → 200 (process liveness)
 *  - GET /health/ready → 200 when the DB is reachable, with the check result
 *  - GET /metrics      → 200, Prometheus text exposition format
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('health + readiness endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /health/ready returns 200 when the database is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'ok',
      checks: { database: 'ok' },
    });
  });

  it('GET /metrics exposes Prometheus metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('process_cpu_user_seconds_total');
  });

  it('propagates a correlation id on the response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.headers['x-request-id']).toBeDefined();
  });
});
