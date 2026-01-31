/**
 * Idempotency Key Parameter Mismatch Tests
 *
 * Audit Issue #10: Same idempotency key with different parameters
 * silently returns old session, allowing parameter manipulation.
 *
 * Fix: Hash request body params and store alongside session. On
 * idempotency match, compare hashes — return 409 Conflict if different.
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Idempotency key parameter mismatch detection', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const email = `idemp-mismatch-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email,
        password: 'SecurePass123!',
      },
    });

    if (signupResponse.statusCode !== 201) {
      // Try login if already exists
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email, password: 'SecurePass123!' },
      });
      accessToken = loginResponse.json().access_token;
    } else {
      accessToken = signupResponse.json().access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 when retrying with same key and same params', async () => {
    const key = `order-same-${Date.now()}`;
    const payload = {
      amount: 100.0,
      currency: 'USD',
      network: 'polygon',
      token: 'USDC',
      merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
    };

    // First request
    const first = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload,
    });
    expect(first.statusCode).toBe(201);

    // Retry with same key and same params
    const retry = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload,
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().id).toBe(first.json().id);
  });

  it('should return 409 when retrying with same key but different amount', async () => {
    const key = `order-diff-${Date.now()}`;

    // First request with amount=100
    const first = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload: {
        amount: 100.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(first.statusCode).toBe(201);

    // Retry with same key but amount=50
    const retry = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload: {
        amount: 50.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(retry.statusCode).toBe(409);
  });

  it('should return 409 when retrying with same key but different merchant_address', async () => {
    const key = `order-addr-${Date.now()}`;

    const first = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload: {
        amount: 100.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    expect(first.statusCode).toBe(201);

    const retry = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': key,
      },
      payload: {
        amount: 100.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0xdEADBEeF00000000000000000000000000000000',
      },
    });
    expect(retry.statusCode).toBe(409);
  });
});
