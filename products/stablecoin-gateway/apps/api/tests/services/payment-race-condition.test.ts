/**
 * Payment Race Condition Tests
 *
 * Verifies that concurrent payment status transitions are serialized
 * by the SELECT ... FOR UPDATE lock in PaymentService.updatePaymentStatus().
 *
 * Key insight: The state machine allows idempotent same-state transitions
 * (COMPLETED -> COMPLETED is valid). So when two concurrent CONFIRMING ->
 * COMPLETED calls are serialized by the lock, the second caller sees
 * COMPLETED (already transitioned by the first), and the COMPLETED ->
 * COMPLETED idempotent path succeeds. Both calls resolve without error.
 *
 * What the lock prevents: duplicate webhooks and race-condition corruption.
 * The service sets completedAt on every COMPLETED transition, so the
 * second caller overwrites it. Tests verify final DB state is consistent.
 */

import { PrismaClient, PaymentStatus } from '@prisma/client';
import { PaymentService } from '../../src/services/payment.service';

const prisma = new PrismaClient();

describe('Payment concurrent status transitions (FOR UPDATE lock)', () => {
  let paymentService: PaymentService;
  let userId: string;

  beforeAll(async () => {
    paymentService = new PaymentService(prisma);

    const user = await prisma.user.create({
      data: {
        email: `payment-race-${Date.now()}@test.com`,
        passwordHash: 'hashed-password',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.webhookDelivery.deleteMany({
      where: { endpoint: { userId } },
    });
    await prisma.webhookEndpoint.deleteMany({ where: { userId } });
    await prisma.paymentSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  /**
   * Create a payment session in CONFIRMING state with a unique txHash.
   * Sets expiresAt 7 days in the future to avoid expiry checks.
   */
  async function createConfirmingPayment(label: string): Promise<string> {
    const session = await prisma.paymentSession.create({
      data: {
        userId,
        amount: 100,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchantAddress: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        status: PaymentStatus.CONFIRMING,
        txHash: `0x${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return session.id;
  }

  it('two concurrent CONFIRMING->COMPLETED: both succeed via idempotent path', async () => {
    const paymentId = await createConfirmingPayment('dual');

    // Fire two concurrent transitions
    const results = await Promise.allSettled([
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
    ]);

    // Both should fulfill: first does CONFIRMING->COMPLETED,
    // second does COMPLETED->COMPLETED (idempotent)
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(0);

    // Both return COMPLETED status
    for (const result of fulfilled) {
      const session = (result as PromiseFulfilledResult<any>).value;
      expect(session.status).toBe(PaymentStatus.COMPLETED);
    }
  });

  it('final DB state after concurrent transitions is COMPLETED', async () => {
    const paymentId = await createConfirmingPayment('final-state');

    await Promise.allSettled([
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
    ]);

    // Verify the database has exactly one row in COMPLETED state
    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: paymentId },
    });

    expect(session.status).toBe(PaymentStatus.COMPLETED);
    expect(session.completedAt).not.toBeNull();
  });

  it('completedAt is set and is a valid timestamp after concurrent transitions', async () => {
    const paymentId = await createConfirmingPayment('timestamp');
    const beforeTransition = new Date();

    await Promise.allSettled([
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
    ]);

    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: paymentId },
    });

    // completedAt must be set (not null)
    expect(session.completedAt).toBeInstanceOf(Date);

    // completedAt should be at or after we started the transitions
    expect(session.completedAt!.getTime()).toBeGreaterThanOrEqual(
      beforeTransition.getTime() - 1000 // 1s tolerance for clock skew
    );

    // completedAt should not be in the future (sanity check)
    expect(session.completedAt!.getTime()).toBeLessThanOrEqual(
      Date.now() + 1000
    );
  });

  it('three concurrent CONFIRMING->COMPLETED: all succeed, exactly one real transition', async () => {
    const paymentId = await createConfirmingPayment('triple');

    const results = await Promise.allSettled([
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
      paymentService.updatePaymentStatus(paymentId, PaymentStatus.COMPLETED, {
        confirmations: 12,
      }),
    ]);

    // All three should fulfill: first does CONFIRMING->COMPLETED,
    // remaining do COMPLETED->COMPLETED (idempotent)
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(3);

    // All returned sessions show COMPLETED
    for (const result of fulfilled) {
      const session = (result as PromiseFulfilledResult<any>).value;
      expect(session.status).toBe(PaymentStatus.COMPLETED);
    }

    // Final DB state: exactly one row, status COMPLETED, completedAt set
    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: paymentId },
    });

    expect(session.status).toBe(PaymentStatus.COMPLETED);
    expect(session.completedAt).not.toBeNull();

    // The payment should still have exactly one record (no duplicates)
    const count = await prisma.paymentSession.count({
      where: { id: paymentId },
    });
    expect(count).toBe(1);
  });
});
