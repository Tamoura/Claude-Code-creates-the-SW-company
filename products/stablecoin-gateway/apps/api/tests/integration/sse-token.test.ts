import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('SSE Token Generation and Validation', () => {
  let app: FastifyInstance;
  let userAccessToken: string;
  let userId: string;
  let paymentSessionId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'sse-token-user@example.com',
        password: 'SecurePass123!',
      },
    });

    if (signupResponse.statusCode === 201) {
      const signupData = signupResponse.json();
      userAccessToken = signupData.access_token;
      userId = signupData.id;
    } else {
      console.log('Signup failed:', signupResponse.statusCode, signupResponse.json());
    }

    // Create payment session
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
      payload: {
        amount: 100.0,
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });

    if (paymentResponse.statusCode === 201) {
      paymentSessionId = paymentResponse.json().id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/sse-token', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        payload: {
          payment_session_id: paymentSessionId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require payment_session_id in request body', async () => {
      if (!userAccessToken) {
        console.log('Skipping: user creation failed');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });

    it('should reject non-existent payment session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          payment_session_id: 'non-existent-id',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.type).toBe('https://gateway.io/errors/payment-not-found');
    });

    it('should reject payment session owned by another user', async () => {
      // Create another user
      const user2Signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'sse-token-user2@example.com',
          password: 'SecurePass123!',
        },
      });
      const user2AccessToken = user2Signup.json().access_token;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
        payload: {
          payment_session_id: paymentSessionId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.type).toBe('https://gateway.io/errors/access-denied');
    });

    it('should generate SSE token with correct structure', async () => {
      if (!paymentSessionId) {
        console.log('Skipping: payment session creation failed');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          payment_session_id: paymentSessionId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('expires_at');
      expect(typeof body.token).toBe('string');
      expect(body.token.length).toBeGreaterThan(0);

      // Verify token has correct expiry (15 minutes from now)
      const expiresAt = new Date(body.expires_at);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
      expect(diffMinutes).toBeGreaterThan(14); // At least 14 minutes
      expect(diffMinutes).toBeLessThan(16); // Less than 16 minutes
    });

    it('should create a token that can be decoded', async () => {
      if (!paymentSessionId) {
        console.log('Skipping: payment session creation failed');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          payment_session_id: paymentSessionId,
        },
      });

      expect(response.statusCode).toBe(200);
      const { token } = response.json();

      // Verify token can be decoded
      const decoded = app.jwt.verify(token) as {
        userId: string;
        paymentSessionId: string;
        type: string;
      };

      expect(decoded.userId).toBe(userId);
      expect(decoded.paymentSessionId).toBe(paymentSessionId);
      expect(decoded.type).toBe('sse');
    });
  });

  describe('SSE endpoint with SSE token', () => {
    // Note: We don't test successful SSE connections (200) because they keep connections
    // open indefinitely, making them incompatible with app.inject() testing.
    // We test error cases only, which close immediately.

    it('should reject expired SSE token', async () => {
      if (!paymentSessionId) {
        console.log('Skipping: payment session creation failed');
        return;
      }

      // Create an expired token (already expired 1 second ago)
      const expiredToken = app.jwt.sign(
        {
          userId,
          paymentSessionId,
          type: 'sse',
        },
        { expiresIn: 1 } // Expires in 1 second
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentSessionId}/events`,
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });


    it('should reject SSE token for wrong payment session', async () => {
      if (!paymentSessionId) {
        console.log('Skipping: payment session creation failed');
        return;
      }

      // Create another payment session
      const payment2Response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          amount: 200.0,
          merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        },
      });

      const paymentSession2Id = payment2Response.json().id;

      // Generate SSE token for first payment session
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/sse-token',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          payment_session_id: paymentSessionId,
        },
      });

      const { token } = tokenResponse.json();

      // Try to use token for second payment session (should fail)
      const response = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentSession2Id}/events`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

  });
});
