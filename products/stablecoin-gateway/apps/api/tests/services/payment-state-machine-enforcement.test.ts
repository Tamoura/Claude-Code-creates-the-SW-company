/**
 * Payment State Machine Enforcement Tests
 *
 * Audit Issue #5: State machine is defined but not enforced in
 * PaymentService.updatePaymentStatus(). The validatePaymentStatusTransition()
 * function exists but is never called by the service method.
 *
 * These tests verify that updatePaymentStatus() rejects invalid
 * status transitions (e.g., COMPLETED → PENDING).
 */

import { PrismaClient, PaymentStatus } from '@prisma/client';
import { PaymentService } from '../../src/services/payment.service';

const prisma = new PrismaClient();

describe('PaymentService.updatePaymentStatus() state machine enforcement', () => {
  let paymentService: PaymentService;
  let userId: string;

  beforeAll(async () => {
    paymentService = new PaymentService(prisma);

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `state-machine-test-${Date.now()}@test.com`,
        passwordHash: 'hashed-password',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.paymentSession.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  async function createPayment(status: PaymentStatus): Promise<string> {
    const session = await prisma.paymentSession.create({
      data: {
        userId,
        amount: 100,
        currency: 'USD',
        network: 'polygon',
        token: 'USDC',
        merchantAddress: '0x742D35CC6634c0532925A3b844BC9E7595F0BEb0',
        status,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return session.id;
  }

  it('should reject COMPLETED → PENDING (invalid transition)', async () => {
    const id = await createPayment(PaymentStatus.COMPLETED);

    await expect(
      paymentService.updatePaymentStatus(id, PaymentStatus.PENDING, {})
    ).rejects.toThrow('Invalid status transition');
  });

  it('should reject FAILED → CONFIRMING (terminal state)', async () => {
    const id = await createPayment(PaymentStatus.FAILED);

    await expect(
      paymentService.updatePaymentStatus(id, PaymentStatus.CONFIRMING, {})
    ).rejects.toThrow('Invalid status transition');
  });

  it('should reject PENDING → COMPLETED (must go through CONFIRMING)', async () => {
    const id = await createPayment(PaymentStatus.PENDING);

    await expect(
      paymentService.updatePaymentStatus(id, PaymentStatus.COMPLETED, {})
    ).rejects.toThrow('Invalid status transition');
  });

  it('should reject PENDING → REFUNDED (cannot refund unpaid payment)', async () => {
    const id = await createPayment(PaymentStatus.PENDING);

    await expect(
      paymentService.updatePaymentStatus(id, PaymentStatus.REFUNDED, {})
    ).rejects.toThrow('Invalid status transition');
  });

  it('should allow valid transition PENDING → CONFIRMING', async () => {
    const id = await createPayment(PaymentStatus.PENDING);

    const result = await paymentService.updatePaymentStatus(
      id,
      PaymentStatus.CONFIRMING,
      { txHash: '0xabc123' }
    );

    expect(result.status).toBe(PaymentStatus.CONFIRMING);
  });

  it('should allow valid transition PENDING → FAILED', async () => {
    const id = await createPayment(PaymentStatus.PENDING);

    const result = await paymentService.updatePaymentStatus(
      id,
      PaymentStatus.FAILED,
      {}
    );

    expect(result.status).toBe(PaymentStatus.FAILED);
  });

  it('should allow idempotent same-state transition', async () => {
    const id = await createPayment(PaymentStatus.PENDING);

    const result = await paymentService.updatePaymentStatus(
      id,
      PaymentStatus.PENDING,
      {}
    );

    expect(result.status).toBe(PaymentStatus.PENDING);
  });
});
