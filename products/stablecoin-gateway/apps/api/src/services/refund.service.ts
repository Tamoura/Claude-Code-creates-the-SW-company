/**
 * Refund Service
 *
 * Handles creation and management of refunds for completed payments.
 *
 * Refund Flow:
 * 1. Merchant creates refund request (PENDING status)
 * 2. System processes refund (PROCESSING status)
 * 3. Blockchain transaction executed
 * 4. Refund completed (COMPLETED status)
 *
 * Security:
 * - Only payment owner can create refunds
 * - Refund amount cannot exceed original payment amount
 * - Payment must be in COMPLETED status
 * - Partial refunds supported
 * - Full refund tracking with blockchain verification
 */

import { PrismaClient, Refund, RefundStatus, PaymentStatus } from '@prisma/client';
import { AppError } from '../types/index.js';
import { generateRefundId } from '../utils/crypto.js';
import { WebhookDeliveryService } from './webhook-delivery.service.js';

export interface CreateRefundRequest {
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  payment_session_id: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
  completed_at: string | null;
}

export class RefundService {
  private webhookService: WebhookDeliveryService;

  constructor(private prisma: PrismaClient) {
    this.webhookService = new WebhookDeliveryService(prisma);
  }

  /**
   * Create a refund request for a completed payment
   *
   * Validations:
   * - Payment must exist and be owned by user
   * - Payment must be in COMPLETED status
   * - Refund amount must not exceed remaining refundable amount
   * - Partial and full refunds supported
   */
  async createRefund(
    userId: string,
    paymentSessionId: string,
    data: CreateRefundRequest
  ): Promise<Refund> {
    // Verify payment exists and user owns it
    const payment = await this.prisma.paymentSession.findFirst({
      where: {
        id: paymentSessionId,
        userId,
      },
      include: {
        refunds: true,
      },
    });

    if (!payment) {
      throw new AppError(404, 'payment-not-found', 'Payment session not found');
    }

    // Verify payment is completed
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new AppError(
        400,
        'payment-not-completed',
        'Payment must be completed before refunding'
      );
    }

    // Calculate total refunded amount (including pending refunds to prevent over-refunding)
    const totalRefunded = payment.refunds
      .filter((r) => r.status !== RefundStatus.FAILED) // Count all non-failed refunds
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const remainingAmount = Number(payment.amount) - totalRefunded;

    // Verify refund amount is valid
    if (data.amount <= 0) {
      throw new AppError(400, 'invalid-refund-amount', 'Refund amount must be greater than 0');
    }

    if (data.amount > remainingAmount) {
      throw new AppError(
        400,
        'refund-exceeds-payment',
        `Refund amount (${data.amount}) exceeds remaining refundable amount (${remainingAmount})`
      );
    }

    // Create refund
    const refund = await this.prisma.refund.create({
      data: {
        id: generateRefundId(),
        paymentSessionId,
        amount: data.amount,
        reason: data.reason,
        status: RefundStatus.PENDING,
      },
    });

    // Queue webhook for refund.created event
    await this.webhookService.queueWebhook(userId, 'refund.created', {
      id: refund.id,
      payment_session_id: refund.paymentSessionId,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      created_at: refund.createdAt.toISOString(),
    });

    return refund;
  }

  /**
   * Get refund by ID (with ownership verification)
   */
  async getRefund(id: string, userId: string): Promise<Refund> {
    const refund = await this.prisma.refund.findFirst({
      where: {
        id,
        paymentSession: {
          userId,
        },
      },
      include: {
        paymentSession: true,
      },
    });

    if (!refund) {
      throw new AppError(404, 'refund-not-found', 'Refund not found');
    }

    return refund;
  }

  /**
   * List refunds for a user with optional filtering
   */
  async listRefunds(
    userId: string,
    filters: {
      paymentSessionId?: string;
      status?: RefundStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: Refund[]; total: number }> {
    const where: any = {
      paymentSession: {
        userId,
      },
    };

    if (filters.paymentSessionId) {
      where.paymentSessionId = filters.paymentSessionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: {
          paymentSession: {
            select: {
              id: true,
              amount: true,
              currency: true,
              merchantAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Process a refund (mark as PROCESSING)
   *
   * This would typically be called by an internal worker/admin
   * to indicate that the refund is being processed
   */
  async processRefund(id: string): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new AppError(404, 'refund-not-found', 'Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new AppError(
        400,
        'invalid-refund-status',
        'Refund must be in PENDING status to process'
      );
    }

    return this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.PROCESSING,
      },
    });
  }

  /**
   * Complete a refund with blockchain transaction details
   *
   * This would typically be called after the blockchain transaction
   * has been confirmed
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

    // Queue webhook for refund.completed event
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

    return updatedRefund;
  }

  /**
   * Mark a refund as failed
   */
  async failRefund(id: string): Promise<Refund> {
    return this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.FAILED,
      },
    });
  }

  /**
   * Format refund for API response
   */
  toResponse(refund: Refund): RefundResponse {
    return {
      id: refund.id,
      payment_session_id: refund.paymentSessionId,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      tx_hash: refund.txHash,
      block_number: refund.blockNumber,
      created_at: refund.createdAt.toISOString(),
      completed_at: refund.completedAt?.toISOString() || null,
    };
  }
}
