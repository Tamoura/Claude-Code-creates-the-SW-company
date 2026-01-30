/**
 * Idempotency Key Format Validation Tests (SEC-015)
 *
 * Verifies that the Idempotency-Key header is validated before use.
 * Valid keys: alphanumeric with hyphens and underscores, 1-64 chars.
 * Invalid keys: empty string, >64 chars, special characters.
 * Missing header is still allowed (the header is optional).
 */

import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Idempotency Key Format Validation', () => {
  let app: FastifyInstance;
  let accessToken: string;

  const TEST_EMAIL = `idem-key-${Date.now()}@example.com`;
  const TEST_PASSWORD = 'SecurePass123!';

  const VALID_PAYMENT_BODY = {
    amount: 25,
    currency: 'USD',
    network: 'polygon',
    token: 'USDC',
    merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  };

  beforeAll(async () => {
    app = await buildApp();

    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    if (signupResponse.statusCode === 201) {
      const body = signupResponse.json();
      accessToken = body.access_token;
    } else {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      const body = loginResponse.json();
      accessToken = body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Valid idempotency keys', () => {
    it('should accept a UUID-format idempotency key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should accept an alphanumeric idempotency key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': 'abc123XYZ',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should accept an idempotency key with underscores', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': 'order_12345_retry_1',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should accept an idempotency key exactly 64 characters long', async () => {
      const key = 'a'.repeat(64);
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': key,
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Missing idempotency key (optional)', () => {
    it('should allow requests without an Idempotency-Key header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Invalid idempotency keys', () => {
    it('should reject an empty string idempotency key with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': '',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });

    it('should reject an idempotency key longer than 64 characters with 400', async () => {
      const key = 'a'.repeat(65);
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': key,
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });

    it('should reject an idempotency key with spaces with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': 'key with spaces',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });

    it('should reject an idempotency key with special characters with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': 'key@with#special$chars!',
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });

    it('should reject an idempotency key with SQL injection attempt with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'idempotency-key': "'; DROP TABLE payment_sessions; --",
        },
        payload: VALID_PAYMENT_BODY,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.title).toBe('Validation Error');
    });
  });
});
