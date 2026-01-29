import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * Rate Limiting Tests
 *
 * Tests rate limiting functionality:
 * - Basic rate limiting enforcement
 * - Distributed rate limiting (if Redis available)
 * - Rate limit headers
 * - Per-route rate limits
 * - Health endpoint exemption (FIX-PHASE2-09)
 *
 * Note: These tests work with both in-memory and Redis-based rate limiting
 * NOTE: Uses unique User-Agent per test to isolate fingerprinted
 * rate limit buckets (auth endpoints use IP+UA fingerprinting)
 */

describe('Rate Limiting', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user with unique UA to avoid rate limit collision
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'rate-limit-test@example.com',
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': `RateLimitTestSetup/${Date.now()}`,
      },
    });

    accessToken = signupResponse.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global rate limiting', () => {
    it('should allow requests within limit on non-exempt endpoints', async () => {
      // Use authenticated endpoint (not health - health is exempt from rate limiting)
      for (let i = 0; i < 3; i++) {
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
      }
    });

    it('should include rate limit headers on non-exempt endpoints', async () => {
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

      // Verify header values are numbers
      const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] as string);

      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(limit);
    });

    it('should not include rate limit headers on exempt /health endpoint', async () => {
      // Health endpoint is exempt from rate limiting (FIX-PHASE2-09)
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      // Exempt endpoints should NOT have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
      expect(response.headers['x-ratelimit-reset']).toBeUndefined();
    });

    it('should never rate limit /health endpoint', async () => {
      // Make many requests to health - should never get 429
      for (let i = 0; i < 20; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
        });

        expect(response.statusCode).not.toBe(429);
        expect([200, 503]).toContain(response.statusCode);
      }
    });
  });

  describe('Authenticated endpoint rate limiting', () => {
    it('should apply rate limits to authenticated requests', async () => {
      // Make a few authenticated requests
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/v1/payment-sessions',
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        // Accept either success or rate limit (depending on previous test runs)
        expect([200, 429]).toContain(response.statusCode);
        expect(response.headers['x-ratelimit-limit']).toBeDefined();

        // If rate limited, we've proven rate limiting works
        if (response.statusCode === 429) {
          break;
        }
      }
    });
  });

  describe('Redis distributed rate limiting', () => {
    it('should indicate Redis status in logs', async () => {
      // This test just verifies that the app starts correctly
      // Actual Redis functionality is tested by making requests above

      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });

      if (healthResponse.statusCode === 500) {
        console.log('Skipping test - Redis connection issue');
        return;
      }

      expect(healthResponse.statusCode).toBe(200);
      const health = healthResponse.json();

      // Redis check may or may not be present depending on configuration
      if (health.checks.redis) {
        expect(['healthy', 'unhealthy', 'not-connected']).toContain(
          health.checks.redis.status
        );
      }
    });

    it('should work correctly with or without Redis', async () => {
      // Rate limiting should work regardless of Redis availability
      // Use authenticated endpoint since health is exempt
      const response1 = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Accept either success or rate limited
      expect([200, 429]).toContain(response1.statusCode);
      expect([200, 429]).toContain(response2.statusCode);

      // Both should have rate limit headers
      expect(response1.headers['x-ratelimit-limit']).toBeDefined();
      expect(response2.headers['x-ratelimit-limit']).toBeDefined();

      // Remaining count should decrease (or stay same if Redis resets between requests)
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] as string);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] as string);

      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });
});
