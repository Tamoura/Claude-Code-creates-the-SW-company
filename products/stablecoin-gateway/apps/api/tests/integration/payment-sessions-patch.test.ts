/**
 * PATCH /v1/payment-sessions/:id endpoint tests
 *
 * Tests the ability to update payment session fields while enforcing
 * security constraints (ownership, field whitelisting).
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../setup';

describe('PATCH /v1/payment-sessions/:id', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let otherUserToken: string;
  let paymentId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create and login first user (owner of payment session)
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'merchant-patch@example.com',
        password: 'SecurePass123!',
      },
    });
    accessToken = signupResponse.json().access_token;

    // Create a payment session (using Vitalik's address as a valid example)
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        amount: 100,
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        description: 'Original description',
      },
    });
    const createBody = createResponse.json();
    paymentId = createBody.id;

    // Create second user for ownership tests
    const otherSignupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: 'other-user@example.com',
        password: 'SecurePass123!',
      },
    });
    otherUserToken = otherSignupResponse.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        payload: {
          customer_address: '0x1234567890123456789012345678901234567890',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when user does not own payment session', async () => {
      // Note: The getPaymentSession method returns 404 for both non-existent sessions
      // and sessions that don't belong to the user. This is intentional to avoid
      // information leakage about which payment sessions exist.
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          customer_address: '0x1234567890123456789012345678901234567890',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent payment session', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/payment-sessions/ps_nonexistent',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: '0x1234567890123456789012345678901234567890',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Field Updates', () => {
    it('should update customer_address successfully', async () => {
      const newAddress = '0x1234567890123456789012345678901234567890';
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: newAddress,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.customer_address).toBe(newAddress);
      expect(body.id).toBe(paymentId);
    });

    it('should update tx_hash successfully', async () => {
      const txHash = '0x' + 'a'.repeat(64);
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tx_hash: txHash,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tx_hash).toBe(txHash);
    });

    it('should update status successfully (to FAILED - no verification needed)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'FAILED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('FAILED');
    });

    it('should update block_number successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          block_number: 12345678,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.block_number).toBe(12345678);
    });

    it('should update confirmations successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          confirmations: 12,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.confirmations).toBe(12);
    });

    it('should update multiple fields at once (without status change requiring verification)', async () => {
      const txHash = '0x' + 'b'.repeat(64);
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tx_hash: txHash,
          block_number: 99999,
          confirmations: 3,
          customer_address: '0x9999999999999999999999999999999999999999',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tx_hash).toBe(txHash);
      expect(body.block_number).toBe(99999);
      expect(body.confirmations).toBe(3);
      expect(body.customer_address).toBe('0x9999999999999999999999999999999999999999');
    });
  });

  describe('Security - Field Whitelisting', () => {
    it('should ignore attempt to update amount (critical field)', async () => {
      // Get original amount
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const originalAmount = getResponse.json().amount;

      // Try to update amount (should be ignored)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 99999,
          customer_address: '0x8888888888888888888888888888888888888888', // Also send a valid field
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // Amount should NOT be updated (ignored)
      expect(body.amount).toBe(originalAmount);

      // But customer_address should be updated (allowed field)
      expect(body.customer_address).toBe('0x8888888888888888888888888888888888888888');
    });

    it('should ignore attempt to update merchant_address (critical field)', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const originalAddress = getResponse.json().merchant_address;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          merchant_address: '0x' + '9'.repeat(40),
          status: 'PENDING',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      // merchant_address should NOT be updated
      expect(body.merchant_address).toBe(originalAddress);
    });

    it('should ignore attempt to update network (critical field)', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const originalNetwork = getResponse.json().network;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          network: 'ethereum',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.network).toBe(originalNetwork);
    });

    it('should ignore attempt to update token (critical field)', async () => {
      const getResponse = await app.inject({
        method: 'GET',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const originalToken = getResponse.json().token;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          token: 'USDT',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBe(originalToken);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid customer_address', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: 'not-a-valid-address',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid tx_hash format', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          tx_hash: 'invalid-hash',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'INVALID_STATUS',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative block_number', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          block_number: -100,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative confirmations', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          confirmations: -5,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should accept empty payload and return unchanged session', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(paymentId);
    });

    it('should handle null values gracefully', async () => {
      // First set a customer address
      await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: '0x1234567890123456789012345678901234567890',
        },
      });

      // Then try to set it to null (should be handled appropriately)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          customer_address: null,
        },
      });

      // Depending on business logic, this might be 400 or 200
      // For now, let's expect 400 (null address not allowed)
      expect(response.statusCode).toBe(400);
    });
  });

  describe('State Machine Validation', () => {
    it('should reject invalid transition: PENDING → COMPLETED', async () => {
      // Create payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();

      // Try to transition directly from PENDING to COMPLETED (skipping CONFIRMING)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${payment.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'COMPLETED',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('invalid-status-transition');
      expect(body.detail).toContain('Invalid status transition from PENDING to COMPLETED');
    });

    it('should reject invalid transition: PENDING → REFUNDED', async () => {
      // Create payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();

      // Try to transition PENDING → REFUNDED (cannot refund unpaid payment)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${payment.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'REFUNDED',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('invalid-status-transition');
      expect(body.detail).toContain('Invalid status transition from PENDING to REFUNDED');
    });

    it('should reject invalid transition: COMPLETED → PENDING', async () => {
      // Create and complete payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();
      const paymentId = payment.id;

      // Mark as COMPLETED (via direct DB update for test)
      await prisma.paymentSession.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' },
      });

      // Try to transition back to PENDING
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'PENDING',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('invalid-status-transition');
      expect(body.detail).toContain('Invalid status transition from COMPLETED to PENDING');
    });

    it('should reject invalid transition: COMPLETED → FAILED', async () => {
      // Create and complete payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();
      const paymentId = payment.id;

      // Mark as COMPLETED
      await prisma.paymentSession.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' },
      });

      // Try to mark completed payment as FAILED
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'FAILED',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('invalid-status-transition');
    });

    it('should allow valid transition: PENDING → FAILED', async () => {
      // Create payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();

      // Mark as FAILED (valid transition from PENDING)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${payment.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'FAILED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('FAILED');
    });

    it('should allow valid transition: COMPLETED → REFUNDED', async () => {
      // Create and complete payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();
      const paymentId = payment.id;

      // Mark as COMPLETED
      await prisma.paymentSession.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' },
      });

      // Mark as REFUNDED (valid transition from COMPLETED)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${paymentId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'REFUNDED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('REFUNDED');
    });

    it('should allow same-state transitions (idempotent)', async () => {
      // Create payment
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/payment-sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          amount: 100,
          merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        },
      });

      const payment = createResponse.json();

      // Update with same status (should succeed - idempotent)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/payment-sessions/${payment.id}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          status: 'PENDING',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('PENDING');
    });
  });
});
