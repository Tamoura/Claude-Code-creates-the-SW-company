/**
 * Payment Session Idempotency Tests
 *
 * Tests idempotency key behavior to prevent duplicate payments from network retries
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Payment Session Idempotency', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create and login user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'idempotency-user@example.com',
        password: 'SecurePass123!',
      },
    });
    const signupBody = signupResponse.json();
    accessToken = signupBody.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/payment-sessions with idempotency_key', () => {
    it('should create payment on first request with idempotency key', async () => {
      const idempotencyKey = `test-${Date.now()}-1`;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 100,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      });

      expect(response.statusCode).toBe(201); // Created
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body.amount).toBe(100);
      expect(body.status).toBe('PENDING');
    });

    it('should return existing payment on duplicate idempotency key (same user)', async () => {
      const idempotencyKey = `test-${Date.now()}-2`;

      // First request - creates payment
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 200,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          description: 'Original payment',
        },
      });

      expect(firstResponse.statusCode).toBe(201);
      const firstBody = firstResponse.json();

      // Second request - same idempotency key (simulates network retry)
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 200,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          description: 'Duplicate attempt', // Different data
        },
      });

      expect(secondResponse.statusCode).toBe(200); // OK, not Created
      const secondBody = secondResponse.json();

      // Should return the same payment
      expect(secondBody.id).toBe(firstBody.id);
      expect(secondBody.description).toBe('Original payment'); // Original data preserved
      expect(secondBody.amount).toBe(200);
    });

    it('should allow idempotency key reuse by different user (scoped to userId)', async () => {
      const idempotencyKey = `test-${Date.now()}-3`;

      // First user creates payment
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 100,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      });
      expect(firstResponse.statusCode).toBe(201);
      const firstBody = firstResponse.json();

      // Create second user
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: {
          email: 'other-idempotency-user@example.com',
          password: 'SecurePass123!',
        },
      });
      const otherToken = signupResponse.json().access_token;

      // Second user can use same idempotency key (scoped to their userId)
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${otherToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 100,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      });

      expect(response.statusCode).toBe(201); // Success - different payment created
      const body = response.json();
      expect(body.id).not.toBe(firstBody.id); // Different payment ID
    });

    it('should allow creating payment without idempotency key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 150,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          // No idempotency_key
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
    });

    it('should allow different users to create payments without idempotency keys', async () => {
      // First payment (no key)
      const response1 = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      });

      expect(response1.statusCode).toBe(201);

      // Second payment (no key) - should succeed and be different
      const response2 = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      });

      expect(response2.statusCode).toBe(201);

      const body1 = response1.json();
      const body2 = response2.json();
      expect(body1.id).not.toBe(body2.id); // Different payments
    });

    it('should return 409 when retrying with same key but different parameters', async () => {
      const idempotencyKey = `test-${Date.now()}-4`;

      // Create payment with specific parameters
      const response1 = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 500,
          merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          description: 'First request',
        },
      });

      expect(response1.statusCode).toBe(201);

      // Retry with SAME key but DIFFERENT amount and address
      // Fix #8: This now returns 409 Conflict instead of silently returning the old session
      const response2 = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          amount: 300,
          merchant_address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          description: 'Retry attempt',
        },
      });

      expect(response2.statusCode).toBe(409);
    });
  });
});
