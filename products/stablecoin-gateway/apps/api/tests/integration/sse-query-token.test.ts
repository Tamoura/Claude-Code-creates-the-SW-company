import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * SSE Security Tests
 *
 * Verifies that query parameter authentication is REJECTED for SSE endpoints.
 * Query tokens leak in logs, browser history, and referrer headers.
 * Only Authorization header with short-lived SSE tokens should be accepted.
 */

describe('SSE Query Token Security', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let sseToken: string;
  let paymentId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-security-test@example.com',
        password: 'SecurePass123!',
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
        merchant_address: '0xCE2AA92B48F94686A4EDeCc20b243c40fD46134b',
      },
    });

    paymentId = paymentResponse.json().id;

    // Get SSE token for this payment
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

  describe('Query Token Rejection (Security)', () => {
    it('should reject query tokens (security - tokens leak in logs)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events?token=${encodeURIComponent(accessToken)}`,
      });

      // Should reject query tokens
      expect(response.statusCode).toBe(401);
      expect(response.body).toContain('Unauthorized');
    });

    it('should reject SSE tokens in query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events?token=${encodeURIComponent(sseToken)}`,
      });

      // Even SSE tokens should not be accepted in query
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Authorization Header Requirement', () => {
    it('should reject requests with missing authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events`,
      });

      expect(response.statusCode).toBe(401);
      expect(response.body).toContain('Unauthorized');
    });

    it('should reject regular access tokens (requires SSE token)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Access tokens should be rejected - only SSE tokens allowed
      expect(response.statusCode).toBe(403);
      expect(response.body).toContain('This endpoint requires an SSE-scoped token');
    });

    it('should accept valid SSE token via Authorization header', async () => {
      // SSE endpoints write to reply.raw and never call reply.send(),
      // so inject() hangs waiting for the response to finish. Use an
      // AbortController to disconnect the client after the SSE stream
      // has been established, which triggers the close handler and
      // allows inject() to resolve.
      const ac = new AbortController();
      setTimeout(() => ac.abort(), 500);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}/events`,
        headers: {
          authorization: `Bearer ${sseToken}`,
        },
        signal: ac.signal as any,
      });

      // Should accept SSE token via Authorization header
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');
    });

    it('should reject SSE token for wrong payment session', async () => {
      // Create another payment
      const payment2Response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 200.0,
          merchant_address: '0xCE2AA92B48F94686A4EDeCc20b243c40fD46134b',
        },
      });

      const payment2Id = payment2Response.json().id;

      // Try to use SSE token from payment1 for payment2
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${payment2Id}/events`,
        headers: {
          authorization: `Bearer ${sseToken}`, // Token scoped to payment1
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.body).toContain('Access denied');
    });
  });
});
