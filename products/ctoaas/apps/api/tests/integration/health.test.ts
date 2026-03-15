/**
 * Health Endpoint Integration Tests
 * Implements: NFR-013 (Health Check Monitoring)
 *
 * Tests verify that GET /health returns comprehensive
 * system status including database and Redis connectivity.
 */
import { FastifyInstance } from 'fastify';
import { getApp, closeApp } from '../helpers';

describe('Health Endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  test('[NFR-013][AC-1] GET /health returns 200 with status ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  test('[NFR-013][AC-2] GET /health includes database connectivity status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(res.body);
    expect(body.database).toBe('connected');
  });

  test('[NFR-013][AC-3] GET /health includes redis connectivity status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(res.body);
    // Redis status should be 'connected' or 'disconnected'
    // In test env without REDIS_URL, the in-memory store
    // is used and should report 'connected'
    expect(['connected', 'disconnected']).toContain(body.redis);
  });

  test('[NFR-013][AC-4] GET /health includes uptime and timestamp', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(res.body);
    expect(body.uptime).toBeDefined();
    expect(typeof body.uptime).toBe('number');
    expect(body.timestamp).toBeDefined();
    // Verify timestamp is a valid ISO 8601 string
    expect(new Date(body.timestamp).toISOString()).toBe(
      body.timestamp
    );
  });

  test('[NFR-013][AC-5] GET /health includes version', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(res.body);
    expect(body.version).toBeDefined();
    expect(typeof body.version).toBe('string');
  });

  test('[NFR-013][AC-6] GET /health returns 503 when database is unreachable', async () => {
    // Disconnect prisma to simulate DB failure
    await app.prisma.$disconnect();

    // Override $queryRaw to throw
    const originalQueryRaw = app.prisma.$queryRaw;
    app.prisma.$queryRaw = (async () => {
      throw new Error('Connection refused');
    }) as typeof originalQueryRaw;

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('degraded');
      expect(body.database).toBe('disconnected');
    } finally {
      // Restore original so other tests are not affected
      app.prisma.$queryRaw = originalQueryRaw;
      await app.prisma.$connect();
    }
  });
});
