/**
 * Refund Finalization Service
 *
 * Handles refund completion, failure, finality confirmation,
 * and payment status updates after refund lifecycle events.
 */

import { PrismaClient, Refund, RefundStatus, PaymentStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { AppError } from '../types/index.js';
import { WebhookDeliveryService } from './webhook-delivery.service.js';
import { BlockchainMonitorService } from './blockchain-monitor.service.js';
import { CONFIRMATION_REQUIREMENTS } from './blockchain-transaction.service.js';

export interface ConfirmFinalityResult {
  status: 'confirmed' | 'pending';
  confirmations: number;
  required?: number;
}

/**
 * Compute the total refunded amount from a list of refunds,
 * excluding those with FAILED status.
 *
 * Uses Decimal.js for exact arithmetic.
 */
export function computeRefundedTotal(
  refunds: { amount: string | number; status: string }[]
): Decimal {
  return refunds
    .filter((r) => r.status !== 'FAILED')
    .reduce((sum, r) => sum.plus(new Decimal(r.amount.toString())), new Decimal(0));
}

/**
 * Compute the remaining refundable amount for a payment.
 *
 * Uses Decimal.js for exact arithmetic.
 */
export function computeRemainingAmount(
  paymentAmount: string | number,
  totalRefunded: Decimal
): Decimal {
  return new Decimal(paymentAmount.toString()).minus(totalRefunded);
}

export class RefundFinalizationService {
  constructor(
    private prisma: PrismaClient,
    private webhookService: WebhookDeliveryService,
    private blockchainMonitor: BlockchainMonitorService
  ) {}

  /**
   * Complete a refund with blockchain transaction details.
   *
   * ADR: Uses $transaction + FOR UPDATE to prevent concurrent
   * double-completion. The userId param is optional because internal
   * callers (refund worker, finality checker) already verified
   * ownership upstream — but when called from a route handler,
   * userId MUST be provided for BOLA protection.
   */
  async completeRefund(id: string, txHash: string, blockNumber?: number, userId?: string): Promise<Refund> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the refund row to prevent concurrent completion.
      // Two separate queries to avoid Prisma tagged-template nesting issues.
      type RefundRow = { id: string; status: string; payment_session_id: string };
      const rows: RefundRow[] = userId
        ? await tx.$queryRaw<RefundRow[]>`
            SELECT r.id, r.status, r.payment_session_id
            FROM "refunds" r
            INNER JOIN "payment_sessions" ps ON r.payment_session_id = ps.id
            WHERE r.id = ${id} AND ps.user_id = ${userId}
            FOR UPDATE OF r
          `
        : await tx.$queryRaw<RefundRow[]>`
            SELECT r.id, r.status, r.payment_session_id
            FROM "refunds" r
            WHERE r.id = ${id}
            FOR UPDATE
          `;

      if (rows.length === 0) {
        throw new AppError(404, 'refund-not-found', 'Refund not found');
      }

      const lockedRefund = rows[0];

      if (lockedRefund.status === RefundStatus.COMPLETED) {
        throw new AppError(400, 'refund-already-completed', 'Refund is already completed');
      }

      if (lockedRefund.status !== RefundStatus.PROCESSING) {
        throw new AppError(400, 'invalid-refund-status', 'Refund must be in PROCESSING status to complete');
      }

      return tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.COMPLETED,
          txHash,
          blockNumber,
          completedAt: new Date(),
        },
        include: { paymentSession: true },
      });
    }, { timeout: 10000 });

    await this.webhookService.queueWebhook(
      result.paymentSession.userId,
      'refund.completed',
      {
        id: result.id,
        payment_session_id: result.paymentSessionId,
        amount: Number(result.amount),
        reason: result.reason,
        status: result.status,
        tx_hash: result.txHash,
        block_number: result.blockNumber,
        created_at: result.createdAt.toISOString(),
        completed_at: result.completedAt?.toISOString() || null,
      }
    );

    await this.updatePaymentStatusIfFullyRefunded(result.paymentSessionId);

    return result;
  }

  /**
   * Mark a refund as failed.
   *
   * ADR: Status guard ensures only PENDING or PROCESSING refunds
   * can be failed. A COMPLETED refund must never be moved back to
   * FAILED — that would create an accounting inconsistency where
   * funds were sent on-chain but the record says "failed".
   */
  async failRefund(id: string, userId?: string): Promise<Refund> {
    const result = await this.prisma.$transaction(async (tx) => {
      const whereClause = userId
        ? { id, paymentSession: { userId } }
        : { id };

      const refund = await tx.refund.findFirst({
        where: whereClause,
        include: { paymentSession: true },
      });

      if (!refund) {
        throw new AppError(404, 'refund-not-found', 'Refund not found');
      }

      if (refund.status === RefundStatus.COMPLETED) {
        throw new AppError(400, 'refund-already-completed', 'Cannot fail a completed refund');
      }

      if (refund.status === RefundStatus.FAILED) {
        return refund; // Idempotent
      }

      return tx.refund.update({
        where: { id },
        data: { status: RefundStatus.FAILED },
        include: { paymentSession: true },
      });
    }, { timeout: 10000 });

    if (result.status === RefundStatus.FAILED) {
      await this.webhookService.queueWebhook(
        result.paymentSession.userId,
        'refund.failed',
        {
          id: result.id,
          payment_session_id: result.paymentSessionId,
          refund_id: result.id,
          amount: Number(result.amount),
          reason: result.reason,
          status: result.status,
          created_at: result.createdAt.toISOString(),
        }
      );
    }

    return result;
  }

  /**
   * Confirm refund transaction finality by checking on-chain confirmations.
   *
   * SEC-014: After executeRefund succeeds with 1 confirmation, the refund
   * is in PROCESSING status. This method checks whether the transaction
   * has reached sufficient network-specific confirmations for finality.
   */
  async confirmRefundFinality(
    refundId: string,
    txHash: string,
    network: 'polygon' | 'ethereum'
  ): Promise<ConfirmFinalityResult> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        paymentSession: true,
      },
    });

    if (!refund) {
      throw new AppError(404, 'refund-not-found', 'Refund not found');
    }

    if (refund.status !== RefundStatus.PROCESSING) {
      throw new AppError(
        400,
        'invalid-refund-status',
        'Refund must be in PROCESSING status to confirm finality'
      );
    }

    const required = CONFIRMATION_REQUIREMENTS[network];
    const confirmations = await this.blockchainMonitor.getConfirmations(network, txHash);

    if (confirmations < required) {
      return {
        status: 'pending',
        confirmations,
        required,
      };
    }

    const completedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        paymentSession: true,
      },
    });

    await this.webhookService.queueWebhook(
      completedRefund.paymentSession.userId,
      'refund.completed',
      {
        id: completedRefund.id,
        payment_session_id: completedRefund.paymentSessionId,
        amount: Number(completedRefund.amount),
        reason: completedRefund.reason,
        status: completedRefund.status,
        tx_hash: completedRefund.txHash,
        block_number: completedRefund.blockNumber,
        created_at: completedRefund.createdAt.toISOString(),
        completed_at: completedRefund.completedAt?.toISOString() || null,
        confirmations,
      }
    );

    await this.updatePaymentStatusIfFullyRefunded(completedRefund.paymentSessionId);

    return {
      status: 'confirmed',
      confirmations,
    };
  }

  /**
   * Check if payment should be marked as REFUNDED and update if so.
   *
   * ADR: Wrapped in $transaction with FOR UPDATE on payment_sessions
   * to prevent the TOCTOU race where two concurrent completeRefund
   * calls both read the payment, both compute totalRefunded == paymentAmount,
   * and both fire a payment.refunded webhook. The row lock serializes
   * these checks so only the first caller updates the status.
   */
  async updatePaymentStatusIfFullyRefunded(paymentSessionId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the payment row to prevent concurrent status updates
      const lockedRows = await tx.$queryRaw<Array<{ id: string; amount: string; status: string; user_id: string }>>`
        SELECT id, amount::text, status, user_id
        FROM "payment_sessions"
        WHERE id = ${paymentSessionId}
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        return null;
      }

      const payment = lockedRows[0];

      // Already refunded — idempotent exit
      if (payment.status === PaymentStatus.REFUNDED) {
        return null;
      }

      const refunds = await tx.refund.findMany({
        where: {
          paymentSessionId,
          status: RefundStatus.COMPLETED,
        },
      });

      const totalRefunded = refunds.reduce((sum, refund) => {
        return sum.plus(new Decimal(refund.amount.toString()));
      }, new Decimal(0));

      const paymentAmount = new Decimal(payment.amount);

      if (!totalRefunded.equals(paymentAmount)) {
        return null;
      }

      const updatedPayment = await tx.paymentSession.update({
        where: { id: paymentSessionId },
        data: { status: PaymentStatus.REFUNDED },
      });

      return {
        payment: updatedPayment,
        userId: payment.user_id,
        totalRefunded,
      };
    }, { timeout: 10000 });

    if (result) {
      await this.webhookService.queueWebhook(
        result.userId,
        'payment.refunded',
        {
          id: result.payment.id,
          payment_session_id: result.payment.id,
          amount: Number(result.payment.amount),
          currency: result.payment.currency,
          status: result.payment.status,
          network: result.payment.network,
          token: result.payment.token,
          merchant_address: result.payment.merchantAddress,
          customer_address: result.payment.customerAddress,
          created_at: result.payment.createdAt.toISOString(),
          refunded_amount: Number(result.totalRefunded),
          metadata: result.payment.metadata,
        }
      );
    }
  }
}
