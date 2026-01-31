/**
 * Refund Idempotency Tests
 *
 * Verifies that the refund creation endpoint supports idempotency
 * via the Idempotency-Key header:
 * - Duplicate key with same params returns existing refund (200)
 * - Duplicate key with different params returns 409 Conflict
 * - Requests without idempotency key create new refunds each time
 */

import { PrismaClient, PaymentStatus } from '@prisma/client';
import { buildApp } from '../../src/app.js';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

describe('Refund idempotency (Idempotency-Key header)', () => {
  let app: FastifyInstance;
  let userId: string;
  let paymentSessionId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test user
    const uniqueEmail = `refund-idemp-${Date.now()}@test.com`;
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail,
        passwordHash: 'hashed-password',
      },
    });
    userId = user.id;

    // Create a completed payment session
    const session = await prisma.paymentSession.create({
      data: {
        userId,
        amount: 100,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchantAddress: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    paymentSessionId = session.id;

    // Generate auth token
    authToken = app.jwt.sign({ userId, type: 'access' });
  });

  afterAll(async () => {
    await prisma.refund.deleteMany({ where: { paymentSessionId } });
    await prisma.paymentSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('should return the same refund for duplicate idempotency key with matching params', async () => {
    const idempotencyKey = `test-idem-${Date.now()}`;

    // First request: creates the refund
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 10,
        reason: 'test refund',
      },
    });

    expect(res1.statusCode).toBe(201);
    const refund1 = JSON.parse(res1.body);

    // Second request: same key, same params — should return existing
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 10,
        reason: 'test refund',
      },
    });

    expect(res2.statusCode).toBe(200);
    const refund2 = JSON.parse(res2.body);

    // Same refund ID
    expect(refund2.id).toBe(refund1.id);
  });

  it('should return 409 for duplicate idempotency key with different params', async () => {
    const idempotencyKey = `test-idem-conflict-${Date.now()}`;

    // First request: creates the refund
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 5,
        reason: 'original reason',
      },
    });

    expect(res1.statusCode).toBe(201);

    // Second request: same key, DIFFERENT amount
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 7,
        reason: 'different reason',
      },
    });

    expect(res2.statusCode).toBe(409);
    const body = JSON.parse(res2.body);
    expect(body.code).toBe('idempotency-mismatch');
  });

  it('should create separate refunds without idempotency key', async () => {
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 2,
        reason: 'no key 1',
      },
    });

    expect(res1.statusCode).toBe(201);
    const refund1 = JSON.parse(res1.body);

    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/refunds',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        payment_session_id: paymentSessionId,
        amount: 2,
        reason: 'no key 2',
      },
    });

    expect(res2.statusCode).toBe(201);
    const refund2 = JSON.parse(res2.body);

    // Different refund IDs
    expect(refund2.id).not.toBe(refund1.id);
  });
});
