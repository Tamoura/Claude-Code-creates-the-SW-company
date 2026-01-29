/**
 * Health check endpoint tests
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with healthy status when database is connected', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
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

  it('should measure database latency', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(body.checks.database.latency).toBeGreaterThanOrEqual(0);
    expect(body.checks.database.latency).toBeLessThan(1000); // Should be less than 1 second
  });

  it('should not require authentication', async () => {
    // Health checks should be publicly accessible for load balancers/monitoring
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });
});
