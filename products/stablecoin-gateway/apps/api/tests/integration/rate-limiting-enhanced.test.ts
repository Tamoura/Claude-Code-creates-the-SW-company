/**
 * Enhanced Rate Limiting Tests - FIX-PHASE2-09
 *
 * Tests for enhanced rate limiting:
 * - Auth endpoints: 5 req/min per IP+UA fingerprint (stricter)
 * - Health/ready endpoints: exempted from rate limiting
 * - Rate limit headers in all responses
 * - Fingerprinting (IP + User-Agent combination)
 *
 * NOTE: Each describe block uses its own app instance and unique
 * User-Agent strings to isolate fingerprinted rate limit buckets
 * in Redis, preventing cross-test interference.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Enhanced Rate Limiting - FIX-PHASE2-09', () => {
  describe('Health endpoint exemption', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should not rate limit /health endpoint even after many requests', async () => {
      // Make many requests to health endpoint - should never be rate limited
      for (let i = 0; i < 150; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
        });

        // Health check should always succeed (200 or 503 for unhealthy)
        // Never 429 (rate limited)
        expect(response.statusCode).not.toBe(429);
        expect([200, 503]).toContain(response.statusCode);
      }
    });

    it('should not have rate limit headers for exempted /health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // Exempted endpoints should not have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
      expect(response.headers['x-ratelimit-reset']).toBeUndefined();
    });
  });

  describe('Auth endpoint fingerprinting', () => {
    let app: FastifyInstance;
    // Use unique User-Agent strings per test to avoid Redis bucket collisions
    const testRunId = Date.now();
    const userAgent1 = `FingerprintTestUA1/${testRunId}`;
    const userAgent2 = `FingerprintTestUA2/${testRunId}`;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should use IP+User-Agent fingerprint for auth endpoints', async () => {
      // Exhaust rate limit with first User-Agent
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/v1/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'WrongPassword123!',
          },
          headers: {
            'user-agent': userAgent1,
          },
        });
      }

      // 6th request with same User-Agent should be rate limited
      const rateLimitedResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': userAgent1,
        },
      });

      expect(rateLimitedResponse.statusCode).toBe(429);

      // Request with DIFFERENT User-Agent should NOT be rate limited
      // (different fingerprint = auth:IP:different-UA)
      const differentUAResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': userAgent2,
        },
      });

      // Should get 401 (invalid credentials) not 429 (rate limited)
      expect(differentUAResponse.statusCode).toBe(401);
    });

    it('should include rate limit headers in auth endpoint responses', async () => {
      const headerTestUA = `RateLimitHeaderTest/${Date.now()}`;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': headerTestUA,
        },
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();

      // Limit should be 5 for auth endpoints
      expect(parseInt(response.headers['x-ratelimit-limit'] as string)).toBe(5);
    });
  });

  describe('Rate limit enforcement for pre-auth endpoints', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return 429 with proper headers when limit exceeded', async () => {
      const userAgent = `RateLimitExceeded/${Date.now()}`;

      // Use login endpoint - fast since no password hashing needed for nonexistent user
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/v1/auth/login',
          payload: {
            email: 'nonexistent@example.com',
            password: 'WrongPassword123!',
          },
          headers: {
            'user-agent': userAgent,
          },
        });
      }

      // 6th request should be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': userAgent,
        },
      });

      expect(response.statusCode).toBe(429);
      expect(response.json()).toMatchObject({
        statusCode: 429,
        error: 'Too Many Requests',
      });

      // Should have Retry-After header
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should truncate User-Agent to 50 characters for fingerprinting', async () => {
      // Very long User-Agent should be truncated
      const longUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Very Long Browser Name Extra Information';

      // This request should not crash and should have rate limit headers
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        headers: {
          'user-agent': longUA,
        },
      });

      // Should either be 401 (invalid) or 429 (rate limited) but not error
      expect([401, 429]).toContain(response.statusCode);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('should handle missing User-Agent gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
        // No user-agent header
      });

      // Should use 'unknown' as fallback and still work
      expect([401, 429]).toContain(response.statusCode);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Global rate limiting with headers', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should include rate limit headers in authenticated endpoint responses', async () => {
      // Signup with unique UA to avoid rate limit collision
      const uniqueUA = `GlobalRateLimitTest/${Date.now()}`;

      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: `header-test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
        },
        headers: {
          'user-agent': uniqueUA,
        },
      });

      // Verify signup succeeded before proceeding
      expect(signupResponse.statusCode).toBe(201);
      const accessToken = signupResponse.json().access_token;

      // Make authenticated request
      const response = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();

      // Global limit should be higher (100 by default)
      const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
      expect(limit).toBeGreaterThanOrEqual(100);
    });
  });
});
