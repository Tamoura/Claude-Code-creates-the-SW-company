/**
 * Refund Payment Status Guard Tests (RISK-044)
 *
 * Verifies that the refund service correctly validates payment status:
 * - COMPLETED payments: refund allowed
 * - REFUNDED payments (partial): refund allowed (remaining balance)
 * - PENDING / CONFIRMING / FAILED: refund rejected
 */

import { PrismaClient, PaymentStatus, RefundStatus } from '@prisma/client';
import Decimal from 'decimal.js';

// Mock dependencies before importing RefundService
jest.mock('../../src/services/blockchain-transaction.service', () => ({
  BlockchainTransactionService: jest.fn(),
  CONFIRMATION_REQUIREMENTS: { polygon: 12, ethereum: 3 },
}));

jest.mock('../../src/services/webhook-delivery.service', () => ({
  WebhookDeliveryService: jest.fn().mockImplementation(() => ({
    queueWebhook: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/services/blockchain-monitor.service', () => ({
  BlockchainMonitorService: jest.fn().mockImplementation(() => ({
    getConfirmations: jest.fn().mockResolvedValue(0),
  })),
}));

jest.mock('../../src/services/refund-query.service', () => ({
  RefundQueryService: jest.fn().mockImplementation(() => ({
    getRefund: jest.fn(),
    listRefunds: jest.fn(),
    toResponse: jest.fn(),
  })),
}));

jest.mock('../../src/services/refund-finalization.service', () => ({
  RefundFinalizationService: jest.fn().mockImplementation(() => ({
    completeRefund: jest.fn(),
    failRefund: jest.fn(),
    confirmRefundFinality: jest.fn(),
  })),
  computeRefundedTotal: jest.fn().mockReturnValue(new Decimal(0)),
  computeRemainingAmount: jest.fn().mockReturnValue(new Decimal(100)),
}));

jest.mock('../../src/utils/crypto', () => ({
  generateRefundId: jest.fn().mockReturnValue('ref_test_status_guard'),
}));

import { RefundService } from '../../src/services/refund.service';
import { WebhookDeliveryService } from '../../src/services/webhook-delivery.service';
import { BlockchainTransactionService } from '../../src/services/blockchain-transaction.service';
import { BlockchainMonitorService } from '../../src/services/blockchain-monitor.service';

function makeMockPrisma() {
  const createdRefund = {
    id: 'ref_test_status_guard',
    paymentSessionId: 'ps_test',
    amount: new Decimal(50),
    reason: 'test',
    idempotencyKey: null,
    status: RefundStatus.PENDING,
    createdAt: new Date(),
    completedAt: null,
    txHash: null,
    blockNumber: null,
  };

  return {
    paymentSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      create: jest.fn().mockResolvedValue(createdRefund),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    // $transaction runs the callback with a tx object that mirrors prisma
    $transaction: jest.fn().mockImplementation(async (fn: Function) => {
      return fn({
        $executeRaw: jest.fn().mockResolvedValue(1),
        paymentSession: {
          findFirst: (mockPrisma as any).paymentSession.findFirst,
        },
        refund: {
          create: (mockPrisma as any).refund.create,
        },
      });
    }),
    $executeRaw: jest.fn(),
  } as unknown as PrismaClient;
}

let mockPrisma: PrismaClient;

function makePayment(status: PaymentStatus, amount = 100) {
  return {
    id: 'ps_test',
    userId: 'user_test',
    amount: new Decimal(amount),
    status,
    refunds: [],
    txHash: '0xabc',
    blockNumber: 12345,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Refund Payment Status Guard (RISK-044)', () => {
  let service: RefundService;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    service = new RefundService(
      mockPrisma,
      new (WebhookDeliveryService as any)(),
      new (BlockchainTransactionService as any)(),
      new (BlockchainMonitorService as any)(),
    );
  });

  it('should allow refund on COMPLETED payment', async () => {
    (mockPrisma as any).paymentSession.findFirst.mockResolvedValue(
      makePayment(PaymentStatus.COMPLETED)
    );

    const refund = await service.createRefund('user_test', 'ps_test', {
      amount: 50,
      reason: 'test',
    });

    expect(refund).toBeDefined();
    expect(refund.id).toBe('ref_test_status_guard');
  });

  it('should allow refund on REFUNDED payment (partial refund remaining)', async () => {
    (mockPrisma as any).paymentSession.findFirst.mockResolvedValue(
      makePayment(PaymentStatus.REFUNDED)
    );

    const refund = await service.createRefund('user_test', 'ps_test', {
      amount: 50,
      reason: 'partial refund continuation',
    });

    expect(refund).toBeDefined();
    expect(refund.id).toBe('ref_test_status_guard');
  });

  it('should reject refund on PENDING payment', async () => {
    (mockPrisma as any).paymentSession.findFirst.mockResolvedValue(
      makePayment(PaymentStatus.PENDING)
    );

    await expect(
      service.createRefund('user_test', 'ps_test', { amount: 50 })
    ).rejects.toThrow('Payment must be in a refundable state (COMPLETED or REFUNDED)');
  });

  it('should reject refund on CONFIRMING payment', async () => {
    (mockPrisma as any).paymentSession.findFirst.mockResolvedValue(
      makePayment(PaymentStatus.CONFIRMING)
    );

    await expect(
      service.createRefund('user_test', 'ps_test', { amount: 50 })
    ).rejects.toThrow('Payment must be in a refundable state (COMPLETED or REFUNDED)');
  });

  it('should reject refund on FAILED payment', async () => {
    (mockPrisma as any).paymentSession.findFirst.mockResolvedValue(
      makePayment(PaymentStatus.FAILED)
    );

    await expect(
      service.createRefund('user_test', 'ps_test', { amount: 50 })
    ).rejects.toThrow('Payment must be in a refundable state (COMPLETED or REFUNDED)');
  });
});
