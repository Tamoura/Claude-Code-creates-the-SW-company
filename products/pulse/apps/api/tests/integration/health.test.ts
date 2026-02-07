import { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/build-app.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should return 200 with ok status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
  });

  it('should include version field', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload);
    expect(body.version).toBe('1.0.0');
  });

  it('should include uptime in seconds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload);
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include database check status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload);
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBe('ok');
  });

  it('should include redis check status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.payload);
    expect(body.checks).toBeDefined();
    // Redis is unavailable in test env by default
    expect(['ok', 'unavailable', 'error']).toContain(body.checks.redis);
  });
});
