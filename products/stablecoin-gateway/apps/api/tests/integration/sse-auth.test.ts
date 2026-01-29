import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('SSE Endpoint Authentication', () => {
  let app: FastifyInstance;
  let user1AccessToken: string;
  let user2AccessToken: string;
  let user1PaymentId: string;
  let user1SseToken: string;
  let user2SseToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create user 1
    const user1Signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-user1@example.com',
        password: 'SecurePass123!',
      },
    });
    user1AccessToken = user1Signup.json().access_token;

    // Create user 2
    const user2Signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-user2@example.com',
        password: 'SecurePass123!',
      },
    });
    user2AccessToken = user2Signup.json().access_token;

    // Create payment session for user 1
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${user1AccessToken}`,
      },
      payload: {
        amount: 100.0,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    user1PaymentId = paymentResponse.json().id;

    // Generate SSE tokens
    const sseToken1Response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sse-token',
      headers: {
        authorization: `Bearer ${user1AccessToken}`,
      },
      payload: {
        payment_session_id: user1PaymentId,
      },
    });
    user1SseToken = sseToken1Response.json().token;

    // Create payment for user 2 to get their SSE token
    const payment2Response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${user2AccessToken}`,
      },
      payload: {
        amount: 200.0,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    const user2PaymentId = payment2Response.json().id;

    const sseToken2Response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sse-token',
      headers: {
        authorization: `Bearer ${user2AccessToken}`,
      },
      payload: {
        payment_session_id: user2PaymentId,
      },
    });
    user2SseToken = sseToken2Response.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should require authentication for SSE endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${user1PaymentId}/events`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject regular access tokens (requires SSE token)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${user1PaymentId}/events`,
      headers: {
        authorization: `Bearer ${user1AccessToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('SSE endpoint requires SSE token');
  });

  it('should allow user to access their own payment session events with SSE token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${user1PaymentId}/events`,
      headers: {
        authorization: `Bearer ${user1SseToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/event-stream');
  });

  it('should reject SSE token from different payment session', async () => {
    // user2SseToken is for a different payment session
    const response = await app.inject({
      method: 'GET',
      url: `/v1/payment-sessions/${user1PaymentId}/events`,
      headers: {
        authorization: `Bearer ${user2SseToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('not valid for this payment session');
  });

  it('should handle non-existent payment session gracefully', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/payment-sessions/non-existent-id/events',
      headers: {
        authorization: `Bearer ${user1SseToken}`,
      },
    });

    // Token is valid for user1PaymentId, not non-existent-id
    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('not valid for this payment session');
  });
});
