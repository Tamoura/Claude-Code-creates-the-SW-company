import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from './test-helpers';

describe('Error Handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return RFC 7807 format for validation errors', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'bad-email', password: '123' },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.type).toBeDefined();
    expect(body.title).toBeDefined();
    expect(body.status).toBe(422);
    expect(body.detail).toBeDefined();
  });

  it('should return RFC 7807 format for not found errors', async () => {
    // Signup to get a token
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'errtest@example.com', password: 'securepass123' },
    });
    const token = JSON.parse(signupRes.body).data.token;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/nonexistent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.type).toContain('not-found');
    expect(body.status).toBe(404);
  });

  it('should return RFC 7807 format for unauthorized errors', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.status).toBe(401);
  });

  it('should return RFC 7807 for conflict errors', async () => {
    // Create user
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'conflict@example.com', password: 'securepass123' },
    });

    // Duplicate
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'conflict@example.com', password: 'securepass123' },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.status).toBe(409);
  });
});
