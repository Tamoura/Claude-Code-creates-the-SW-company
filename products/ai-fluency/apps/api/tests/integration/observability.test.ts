/**
 * tests/integration/observability.test.ts — Observability plugin tests
 *
 * Tests the /metrics endpoint and observability plugin behavior.
 *
 * [BACKEND-01] Observability plugin tests
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('[BACKEND-01] Observability Plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('[BACKEND-01] GET /metrics returns 401 without internal key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.status).toBe(401);
  });

  test('[BACKEND-01] GET /metrics returns 401 with wrong internal key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': 'wrong-key' },
    });

    expect(response.statusCode).toBe(401);
  });

  test('[BACKEND-01] GET /metrics returns 200 with correct internal key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('requests_total');
    expect(body).toHaveProperty('errors_total');
    expect(body).toHaveProperty('performance');
    expect(body).toHaveProperty('started_at');
    expect(body).toHaveProperty('timestamp');
  });

  test('[BACKEND-01] GET /metrics response includes performance percentiles', async () => {
    // Make some requests to generate data
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/health' });

    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });

    const body = response.json();
    expect(body.performance).toHaveProperty('avg_ms');
    expect(body.performance).toHaveProperty('p50_ms');
    expect(body.performance).toHaveProperty('p95_ms');
    expect(body.performance).toHaveProperty('p99_ms');
    expect(typeof body.performance.avg_ms).toBe('number');
  });

  test('[BACKEND-01] requests_total increases with each request', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });
    const beforeTotal = before.json().requests_total;

    // Make some requests
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/ready' });

    const after = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });
    const afterTotal = after.json().requests_total;

    expect(afterTotal).toBeGreaterThan(beforeTotal);
  });

  test('[BACKEND-01] 4xx errors increment errors_total', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });
    const beforeErrors = before.json().errors_total;

    // Make a 404 request
    await app.inject({ method: 'GET', url: '/nonexistent-path-xyz' });

    const after = await app.inject({
      method: 'GET',
      url: '/metrics',
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY! },
    });
    const afterErrors = after.json().errors_total;

    expect(afterErrors).toBeGreaterThan(beforeErrors);
  });
});
