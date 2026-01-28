/**
 * Isolated rate limiting tests
 * Each test file gets its own app instance, preventing rate limit carryover
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Auth Endpoint Rate Limiting - Signup', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow 5 signups then block 6th attempt', async () => {
    // Clean database
    await app.prisma.user.deleteMany();

    // Make 5 successful signups
    for (let i = 0; i < 5; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: `user${i}@example.com`,
          password: 'SecurePassword123!',
        },
      });

      expect(response.statusCode).toBe(201);
    }

    // 6th attempt should be rate limited
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'user5@example.com',
        password: 'SecurePassword123!',
      },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
    });
  });

  it('should include rate limit headers', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'headers-test@example.com',
        password: 'SecurePassword123!',
      },
    });

    // Check for rate limit headers (response may be 429 or 201 depending on previous tests)
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });
});
