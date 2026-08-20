/**
 * Health endpoint — the smoke test every other integration test depends on.
 * Runs against a real PostgreSQL (Article III: no mocks).
 */
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports database connectivity', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect([200, 503]).toContain(response.statusCode);
    expect(body).toMatchObject({
      database: expect.any(String),
      uptime: expect.any(Number),
      timestamp: expect.any(String),
    });
    // 503 when Postgres is unreachable — never a cheerful 200.
    expect(response.statusCode === 200).toBe(body.database === 'connected');
  });

  it('echoes the correlation id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'test-correlation-id' },
    });
    expect(response.headers['x-request-id']).toBe('test-correlation-id');
  });

  it('answers liveness without touching a dependency', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
