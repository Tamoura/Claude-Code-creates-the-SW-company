/**
 * Health check endpoint integration tests
 */

import { FastifyInstance } from 'fastify';
import { getApp, closeApp } from '../helpers';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('should return 200 with healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    // Public response should not expose infrastructure checks
    expect(body).not.toHaveProperty('checks');
  });

  it('should return detailed checks with internal API key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-internal-api-key': 'test-internal-api-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('checks');
    expect(body.checks.database).toHaveProperty('status', 'healthy');
    expect(body.checks.database).toHaveProperty('latency');
    expect(typeof body.checks.database.latency).toBe('number');
  });

  it('should include timestamp in ISO format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it('should not require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should not expose checks with wrong internal API key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-internal-api-key': 'wrong-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
    expect(body).not.toHaveProperty('checks');
  });
});
