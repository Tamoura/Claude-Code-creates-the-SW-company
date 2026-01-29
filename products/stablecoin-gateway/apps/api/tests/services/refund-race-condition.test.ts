/**
 * Refund Race Condition Tests
 *
 * FIX-PHASE3-02: Verifies that the refund creation flow uses
 * database-level locking (FOR UPDATE) to prevent concurrent
 * refunds from over-refunding a payment.
 *
 * Tests:
 * 1. Single refund succeeds normally
 * 2. Full refund leaves zero remaining
 * 3. Over-refund blocked (single request)
 * 4. Concurrent refunds: only one should succeed if total exceeds payment
 * 5. Partial refunds calculate correctly
 * 6. Transaction rolls back on error
 */

import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { PaymentStatus, RefundStatus } from '@prisma/client';

describe('Refund Race Condition Prevention (FOR UPDATE)', () => {
  let app: FastifyInstance;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Clear rate limit keys in Redis to prevent cross-test interference
    if (app.redis) {
      const keys = await app.redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }

    // Use a unique email with timestamp to avoid collisions
    const uniqueEmail = `refund-race-${Date.now()}@example.com`;

    // Create test user
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        email: uniqueEmail,
        password: 'SecurePass123!',
      },
    });

    expect(signupResponse.statusCode).toBe(201);
    accessToken = signupResponse.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // Flush rate limit keys between tests to prevent cross-test 429s
  // The test suite makes many requests per user (>100), exceeding the
  // default rate limit window. This is only needed for testing.
  beforeEach(async () => {
    if (app.redis) {
      const keys = await app.redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await app.redis.del(...keys);
      }
    }
  });

  /**
   * Helper: create a completed payment session with a given amount
   */
  async function createCompletedPayment(amount: number): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/payment-sessions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        amount,
        merchant_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      },
    });

    const paymentId = response.json().id;

    await app.prisma.paymentSession.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        txHash: `0x${paymentId.replace('ps_', '')}`,
        blockNumber: 12345,
        completedAt: new Date(),
      },
    });

    return paymentId;
  }

  /**
   * Helper: create a refund request via the API
   */
  async function createRefund(
    paymentSessionId: string,
    amount: number,
    reason?: string
  ) {
    return app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        payment_session_id: paymentSessionId,
        amount,
        reason: reason || 'Test refund',
      },
    });
  }

  describe('Single refund succeeds normally', () => {
    it('should create a refund for a completed payment', async () => {
      const paymentId = await createCompletedPayment(100);
      const response = await createRefund(paymentId, 50);

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toMatch(/^ref_/);
      expect(body.payment_session_id).toBe(paymentId);
      expect(body.amount).toBe(50);
      expect(body.status).toBe(RefundStatus.PENDING);
    });
  });

  describe('Full refund leaves zero remaining', () => {
    it('should allow full refund then reject any additional refund', async () => {
      const paymentId = await createCompletedPayment(100);

      // Full refund
      const fullRefund = await createRefund(paymentId, 100);
      expect(fullRefund.statusCode).toBe(201);
      expect(fullRefund.json().amount).toBe(100);

      // Any subsequent refund should be rejected (0 remaining)
      const extraRefund = await createRefund(paymentId, 1);
      expect(extraRefund.statusCode).toBe(400);
      expect(extraRefund.json().detail).toContain('exceeds');
    });
  });

  describe('Over-refund blocked (single request)', () => {
    it('should reject refund amount exceeding remaining', async () => {
      const paymentId = await createCompletedPayment(100);

      // First partial refund
      const first = await createRefund(paymentId, 60);
      expect(first.statusCode).toBe(201);

      // Attempt to refund more than remaining (40)
      const over = await createRefund(paymentId, 50);
      expect(over.statusCode).toBe(400);
      expect(over.json().detail).toContain('exceeds');
    });
  });

  describe('Concurrent refunds cannot over-refund', () => {
    it('should prevent two concurrent full refunds from both succeeding', async () => {
      const paymentId = await createCompletedPayment(100);

      // Fire two concurrent full refund requests
      const [response1, response2] = await Promise.all([
        createRefund(paymentId, 100, 'Concurrent refund 1'),
        createRefund(paymentId, 100, 'Concurrent refund 2'),
      ]);

      const statuses = [response1.statusCode, response2.statusCode].sort();

      // One should succeed (201), the other should fail (400)
      expect(statuses).toEqual([201, 400]);

      // Verify the failed one mentions over-refund
      const failedResponse = response1.statusCode === 400
        ? response1
        : response2;
      expect(failedResponse.json().detail).toContain('exceeds');

      // Verify total refunds in DB do not exceed payment amount
      const refunds = await app.prisma.refund.findMany({
        where: { paymentSessionId: paymentId },
      });

      const totalRefunded = refunds
        .filter(r => r.status !== RefundStatus.FAILED)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      expect(totalRefunded).toBeLessThanOrEqual(100);
    });

    it('should prevent concurrent partial refunds from exceeding total', async () => {
      const paymentId = await createCompletedPayment(100);

      // Fire 5 concurrent refunds of 30 each (total 150 > 100)
      const responses = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createRefund(paymentId, 30, `Concurrent partial ${i}`)
        )
      );

      const successes = responses.filter(r => r.statusCode === 201);
      const failures = responses.filter(r => r.statusCode === 400);

      // At most 3 can succeed (3 * 30 = 90 <= 100), 4th would be 120 > 100
      expect(successes.length).toBeLessThanOrEqual(3);
      expect(failures.length).toBeGreaterThanOrEqual(2);

      // Verify DB totals
      const refunds = await app.prisma.refund.findMany({
        where: { paymentSessionId: paymentId },
      });

      const totalRefunded = refunds
        .filter(r => r.status !== RefundStatus.FAILED)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      expect(totalRefunded).toBeLessThanOrEqual(100);
    });

    it('should serialize concurrent refunds on the same payment', async () => {
      const paymentId = await createCompletedPayment(200);

      // Fire 3 concurrent refunds that should all fit (3 * 50 = 150 <= 200)
      const responses = await Promise.all([
        createRefund(paymentId, 50, 'Batch A'),
        createRefund(paymentId, 50, 'Batch B'),
        createRefund(paymentId, 50, 'Batch C'),
      ]);

      const successes = responses.filter(r => r.statusCode === 201);

      // All 3 should succeed (total 150 <= 200)
      expect(successes.length).toBe(3);

      // Verify DB totals
      const refunds = await app.prisma.refund.findMany({
        where: { paymentSessionId: paymentId },
      });

      const totalRefunded = refunds
        .filter(r => r.status !== RefundStatus.FAILED)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      expect(totalRefunded).toBe(150);
    });
  });

  describe('Partial refunds calculate correctly', () => {
    it('should track cumulative refunds across multiple requests', async () => {
      const paymentId = await createCompletedPayment(100);

      // Sequential partial refunds: 20, 30, 40 = 90
      const r1 = await createRefund(paymentId, 20);
      expect(r1.statusCode).toBe(201);

      const r2 = await createRefund(paymentId, 30);
      expect(r2.statusCode).toBe(201);

      const r3 = await createRefund(paymentId, 40);
      expect(r3.statusCode).toBe(201);

      // Total is 90, only 10 remaining
      const r4 = await createRefund(paymentId, 11);
      expect(r4.statusCode).toBe(400);

      // But exactly 10 should work
      const r5 = await createRefund(paymentId, 10);
      expect(r5.statusCode).toBe(201);
    });
  });

  describe('Transaction rolls back on error', () => {
    it('should not create partial state on validation failure', async () => {
      const paymentId = await createCompletedPayment(100);

      // Try to refund more than the payment (should fail)
      const response = await createRefund(paymentId, 200);
      expect(response.statusCode).toBe(400);

      // Verify no refund was created in DB
      const refunds = await app.prisma.refund.findMany({
        where: { paymentSessionId: paymentId },
      });

      expect(refunds.length).toBe(0);
    });

    it('should not leave orphaned records when over-refund is rejected', async () => {
      const paymentId = await createCompletedPayment(100);

      // First refund succeeds
      const r1 = await createRefund(paymentId, 80);
      expect(r1.statusCode).toBe(201);

      // Second refund fails (80 + 30 > 100)
      const r2 = await createRefund(paymentId, 30);
      expect(r2.statusCode).toBe(400);

      // Only the first refund should exist
      const refunds = await app.prisma.refund.findMany({
        where: { paymentSessionId: paymentId },
      });

      expect(refunds.length).toBe(1);
      expect(Number(refunds[0].amount)).toBe(80);
    });
  });
});
