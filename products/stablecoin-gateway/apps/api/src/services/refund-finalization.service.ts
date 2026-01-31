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
   * Complete a refund with blockchain transaction details
   */
  async completeRefund(id: string, txHash: string, blockNumber?: number): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        paymentSession: true,
      },
    });

    if (!refund) {
      throw new AppError(404, 'refund-not-found', 'Refund not found');
    }

    if (refund.status === RefundStatus.COMPLETED) {
      throw new AppError(400, 'refund-already-completed', 'Refund is already completed');
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.COMPLETED,
        txHash,
        blockNumber,
        completedAt: new Date(),
      },
    });

    await this.webhookService.queueWebhook(
      refund.paymentSession.userId,
      'refund.completed',
      {
        id: updatedRefund.id,
        payment_session_id: updatedRefund.paymentSessionId,
        amount: Number(updatedRefund.amount),
        reason: updatedRefund.reason,
        status: updatedRefund.status,
        tx_hash: updatedRefund.txHash,
        block_number: updatedRefund.blockNumber,
        created_at: updatedRefund.createdAt.toISOString(),
        completed_at: updatedRefund.completedAt?.toISOString() || null,
      }
    );

    await this.updatePaymentStatusIfFullyRefunded(updatedRefund.paymentSessionId);

    return updatedRefund;
  }

  /**
   * Mark a refund as failed
   */
  async failRefund(id: string): Promise<Refund> {
    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.FAILED,
      },
      include: {
        paymentSession: true,
      },
    });

    await this.webhookService.queueWebhook(
      refund.paymentSession.userId,
      'refund.failed',
      {
        id: refund.id,
        payment_session_id: refund.paymentSessionId,
        refund_id: refund.id,
        amount: Number(refund.amount),
        reason: refund.reason,
        status: refund.status,
        created_at: refund.createdAt.toISOString(),
      }
    );

    return refund;
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
   * Check if payment should be marked as REFUNDED and update if so
   */
  async updatePaymentStatusIfFullyRefunded(paymentSessionId: string): Promise<void> {
    const payment = await this.prisma.paymentSession.findUnique({
      where: { id: paymentSessionId },
      include: {
        refunds: {
          where: {
            status: RefundStatus.COMPLETED,
          },
        },
      },
    });

    if (!payment) {
      return;
    }

    const totalRefunded = payment.refunds.reduce((sum, refund) => {
      return sum.plus(new Decimal(refund.amount.toString()));
    }, new Decimal(0));

    const paymentAmount = new Decimal(payment.amount.toString());

    if (totalRefunded.equals(paymentAmount)) {
      const updatedPayment = await this.prisma.paymentSession.update({
        where: { id: paymentSessionId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      await this.webhookService.queueWebhook(
        payment.userId,
        'payment.refunded',
        {
          id: updatedPayment.id,
          payment_session_id: updatedPayment.id,
          amount: Number(updatedPayment.amount),
          currency: updatedPayment.currency,
          status: updatedPayment.status,
          network: updatedPayment.network,
          token: updatedPayment.token,
          merchant_address: updatedPayment.merchantAddress,
          customer_address: updatedPayment.customerAddress,
          created_at: updatedPayment.createdAt.toISOString(),
          refunded_amount: totalRefunded,
          metadata: updatedPayment.metadata,
        }
      );
    }
  }
}
