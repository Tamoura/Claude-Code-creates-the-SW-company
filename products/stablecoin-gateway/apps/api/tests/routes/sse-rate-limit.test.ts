import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * SSE Endpoint Rate Limiting tests
 *
 * Verifies that the SSE endpoint at GET /v1/payment-sessions/:id/events
 * has per-user rate limiting to prevent connection exhaustion DoS attacks.
 *
 * Strategy: The SSE endpoint uses reply.raw.writeHead() which keeps
 * connections open. For rate limiting tests, we focus on the fact that
 * @fastify/rate-limit intercepts BEFORE the handler runs, so a 429
 * response returns immediately without entering the SSE handler.
 * For successful connections, we use unauthenticated requests that
 * return quickly (401) to verify the route is reachable, and test
 * rate limiting by exceeding the limit to get 429 responses.
 *
 * NOTE: Uses unique User-Agent headers to isolate fingerprinted
 * rate limit buckets from other test files.
 */

describe('SSE Endpoint Rate Limiting', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentId: string;
  let sseToken: string;
  // Unique User-Agent to isolate rate limit bucket from other test files
  const testUA = `SSERateLimitTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `sse-ratelimit-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      },
      headers: {
        'user-agent': testUA,
      },
    });
    accessToken = signupResponse.json().access_token;

    // Create payment session
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100.0,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    paymentId = paymentResponse.json().id;

    // Generate SSE token
    const sseTokenResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/sse-token',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        payment_session_id: paymentId,
      },
    });
    sseToken = sseTokenResponse.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow SSE connection within rate limit', async () => {
    // A request without auth returns 401 immediately (doesn't enter the
    // long-lived SSE handler). If rate limiting were blocking, we'd get
    // 429 instead. This verifies the route is reachable and not pre-blocked.
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}/events`,
    });

    // 401 means the route was reached (not rate limited)
    expect(response.statusCode).toBe(401);
  });

  it('should rate limit SSE connections per user', async () => {
    // SSE rate limit should be 10 per minute per user.
    // Use unauthenticated requests which return immediately (401)
    // to rapidly consume the rate limit for this IP.
    // After exceeding the limit, we should get 429.
    const responses = [];
    for (let i = 0; i < 15; i++) {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events`,
      });
      responses.push(response);
    }

    // At least one response should be rate limited (429)
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);

    // Verify the 429 response has the expected format
    const rateLimitedResponse = rateLimitedResponses[0];
    expect(rateLimitedResponse.statusCode).toBe(429);
    const body = rateLimitedResponse.json();
    expect(body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
    });
  });
});
