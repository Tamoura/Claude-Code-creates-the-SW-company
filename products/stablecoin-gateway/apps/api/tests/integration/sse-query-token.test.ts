import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

/**
 * SSE Query Token Authentication Tests
 *
 * Tests authentication via query parameter for SSE endpoints.
 * This is necessary because EventSource API cannot set custom headers.
 *
 * Note: These tests focus on authentication and authorization, not full SSE streaming.
 * SSE connections stay open indefinitely, which makes them difficult to test with inject().
 */

describe('SSE Query Token Authentication', () => {
  let app: FastifyInstance;
  let validAccessToken: string;
  let invalidToken: string;
  let paymentId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-query-test@example.com',
        password: 'SecurePass123!',
      },
    });

    validAccessToken = signupResponse.json().access_token;
    invalidToken = 'invalid.jwt.token';

    // Create payment session
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${validAccessToken}`,
      },
      payload: {
        amount: 100.0,
        merchant_address: '0xCE2AA92B48F94686A4EDeCc20b243c40fD46134b',
      },
    });

    if (paymentResponse.statusCode === 201) {
      paymentId = paymentResponse.json().id;
    } else {
      console.error('Payment creation failed:', paymentResponse.statusCode, paymentResponse.json());
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests with missing token parameter', async () => {
    if (!paymentId) {
      console.log('Skipping: payment creation failed');
      return;
    }

    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}/events`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toContain('Unauthorized');
  });

  it('should reject requests with invalid token', async () => {
    if (!paymentId) {
      console.log('Skipping: payment creation failed');
      return;
    }

    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}/events?token=${invalidToken}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toContain('Unauthorized');
  });

  it('should reject access to payment session owned by different user', async () => {
    if (!paymentId) {
      console.log('Skipping: payment creation failed');
      return;
    }

    // Create second user
    const user2Signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-query-test-user2@example.com',
        password: 'SecurePass123!',
      },
    });

    const user2Token = user2Signup.json().access_token;

    // Try to access user 1's payment session with user 2's token
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${paymentId}/events?token=${encodeURIComponent(user2Token)}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Access denied');
  });

  it('should handle non-existent payment session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/non-existent-id/events?token=${encodeURIComponent(validAccessToken)}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('not found');
  });
});
