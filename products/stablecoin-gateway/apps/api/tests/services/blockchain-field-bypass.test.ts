/**
 * Blockchain Field Bypass Prevention Tests
 *
 * Audit Issue #1: PATCH allows injecting fake tx_hash, block_number,
 * confirmations without a status transition, bypassing blockchain
 * verification.
 *
 * These tests verify that PATCH rejects blockchain field updates
 * (tx_hash, block_number, confirmations) when there is no status
 * transition to CONFIRMING or COMPLETED.
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('PATCH /v1/payment-sessions/:id — blockchain field bypass prevention', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let paymentId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create user and get access token
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: `blockchain-bypass-${Date.now()}@test.com`,
        password: 'SecurePass123!',
      },
    });
    accessToken = signupResponse.json().access_token;

    // Create a payment session
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        amount: 100.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    paymentId = paymentResponse.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject PATCH with tx_hash but no status change', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.type).toContain('blockchain-fields-require-status-transition');
  });

  it('should reject PATCH with block_number but no status change', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        block_number: 999999,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.type).toContain('blockchain-fields-require-status-transition');
  });

  it('should reject PATCH with confirmations but no status change', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        confirmations: 12,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.type).toContain('blockchain-fields-require-status-transition');
  });

  it('should allow PATCH with only customer_address (non-blockchain field)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-sessions/${paymentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        customer_address: '0x1234567890123456789012345678901234567890',
      },
    });

    // Should succeed (200) since customer_address is not a blockchain field
    expect(response.statusCode).toBe(200);
  });

  it('should allow PATCH with status transition to FAILED (no blockchain fields needed)', async () => {
    // Create a fresh payment for this test
    const paymentResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        amount: 50.0,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchant_address: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
      },
    });
    const freshPaymentId = paymentResponse.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/payment-sessions/${freshPaymentId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        status: 'FAILED',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('FAILED');
  });
});
