/**
 * Auth endpoint rate limiting tests - Login and Refresh
 * Note: Signup tests are in auth-rate-limit-isolated.test.ts to prevent rate limit carryover
 *
 * NOTE: Uses unique User-Agent per test suite to isolate fingerprinted
 * rate limit buckets (auth endpoints use IP+UA fingerprinting)
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Auth Endpoint Rate Limiting - Login', () => {
  let app: FastifyInstance;
  // Unique User-Agent to isolate this test's rate limit bucket
  const testUA = `LoginRateLimitTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    // Clean database and create test user
    await app.prisma.user.deleteMany();
    await app.prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: '$2b$10$YourHashedPasswordHere', // This won't match any password
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow 5 login attempts then block 6th', async () => {
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': testUA,
        },
      });

      expect(response.statusCode).toBe(401);
    }

    // 6th attempt should be rate limited
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
    });
  });

  it('should include rate limit headers in login response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'test',
      },
      headers: {
        'user-agent': `LoginHeaderTest/${Date.now()}`,
      },
    });

    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });
});

describe('Auth Endpoint Rate Limiting - Refresh', () => {
  let app: FastifyInstance;
  // Unique User-Agent to isolate this test's rate limit bucket
  const testUA = `RefreshRateLimitTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should apply rate limiting to refresh endpoint', async () => {
    // Make 5 failed refresh attempts
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: {
          refresh_token: 'invalid-token',
        },
        headers: {
          'user-agent': testUA,
        },
      });
    }

    // 6th attempt should be rate limited
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {
        refresh_token: 'another-invalid-token',
      },
      headers: {
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
    });
  });
});
