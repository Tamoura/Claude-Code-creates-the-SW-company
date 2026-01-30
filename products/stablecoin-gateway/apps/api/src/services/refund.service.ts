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
import { BlockchainTransactionService } from './blockchain-transaction.service.js';

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
  private blockchainService: BlockchainTransactionService | null;

  constructor(private prisma: PrismaClient) {
    this.webhookService = new WebhookDeliveryService(prisma);

    // Initialize blockchain service if merchant wallet is configured
    try {
      this.blockchainService = new BlockchainTransactionService();
    } catch (error) {
      this.blockchainService = null;

      // In production, blockchain service is REQUIRED
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'BlockchainTransactionService initialization failed in production. ' +
          'Refunds cannot be processed without blockchain access. ' +
          `Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // In development/test, log warning but allow mocking
      console.warn(
        'BlockchainTransactionService not available. ' +
        'Refunds will be created but not executed on-chain. ' +
        'This is only acceptable in development/test environments.'
      );
    }
  }

  /**
   * Check if blockchain service is available for processing refunds
   */
  isBlockchainAvailable(): boolean {
    return this.blockchainService !== null;
  }

  /**
   * Create a refund request for a completed payment
   *
   * Uses database-level row locking (FOR UPDATE) to prevent
   * concurrent refund requests from over-refunding a payment.
   * The entire read-validate-create flow runs inside a single
   * transaction, ensuring atomicity.
   *
   * Validations:
   * - Payment must exist and be owned by user
   * - Payment must be in COMPLETED status
   * - Refund amount must not exceed remaining refundable amount
   * - Partial and full refunds supported
   *
   * Concurrency safety:
   * - FOR UPDATE lock on payment_sessions row serializes access
   * - Webhook is queued after transaction commits (best-effort)
   * - 10 second transaction timeout prevents deadlocks
   */
  async createRefund(
    userId: string,
    paymentSessionId: string,
    data: CreateRefundRequest
  ): Promise<Refund> {
    // Validate amount early (before acquiring lock)
    if (data.amount <= 0) {
      throw new AppError(400, 'invalid-refund-amount', 'Refund amount must be greater than 0');
    }

    // CRITICAL: Wrap entire flow in a transaction with FOR UPDATE
    // to prevent concurrent refund requests from over-refunding.
    //
    // Without this lock, two concurrent requests can both read the
    // same remaining amount, both pass the over-refund check, and
    // both create refunds that together exceed the payment amount.
    //
    // Pattern matches payment-sessions.ts lines 186-211.
    const refund = await this.prisma.$transaction(async (tx) => {
      // Lock the payment session row to serialize concurrent refunds
      // FOR UPDATE prevents other transactions from reading this row
      // until this transaction commits or rolls back
      await tx.$executeRaw`
        SELECT 1 FROM "payment_sessions"
        WHERE id = ${paymentSessionId} AND user_id = ${userId}
        FOR UPDATE
      `;

      // Now safely read the payment with all refunds
      // (no other transaction can modify refunds for this payment)
      const payment = await tx.paymentSession.findFirst({
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

      // Calculate remaining (now safe from race conditions)
      const totalRefunded = payment.refunds
        .filter((r) => r.status !== RefundStatus.FAILED)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const remainingAmount = Number(payment.amount) - totalRefunded;

      if (data.amount > remainingAmount) {
        throw new AppError(
          400,
          'refund-exceeds-payment',
          `Refund amount (${data.amount}) exceeds remaining refundable amount (${remainingAmount})`
        );
      }

      // Create refund within the same transaction
      const newRefund = await tx.refund.create({
        data: {
          id: generateRefundId(),
          paymentSessionId,
          amount: data.amount,
          reason: data.reason,
          status: RefundStatus.PENDING,
        },
      });

      return newRefund;
    }, {
      timeout: 10000, // 10 second timeout to prevent deadlocks
    });

    // Queue webhook outside the transaction (non-critical, best-effort)
    // This avoids holding the row lock while making network calls
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
   * Process a refund (execute blockchain transaction)
   *
   * This executes the actual on-chain refund transaction:
   * 1. Marks refund as PROCESSING
   * 2. Executes blockchain transaction to send tokens back to customer
   * 3. Updates refund with transaction hash and status
   *
   * Requires MERCHANT_WALLET_PRIVATE_KEY to be configured
   */
  async processRefund(id: string): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        paymentSession: true,
      },
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

    // Check if blockchain service is available
    if (!this.blockchainService) {
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          500,
          'blockchain-service-unavailable',
          'Cannot process refund: blockchain service unavailable'
        );
      }

      // In dev/test, log warning and skip on-chain execution
      console.warn(`Skipping on-chain refund for ${id} - no blockchain service`);
      return refund;
    }

    // Mark as PROCESSING
    await this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.PROCESSING,
      },
    });

    try {
      // Validate customer address is available
      if (!refund.paymentSession.customerAddress) {
        await this.prisma.refund.update({
          where: { id },
          data: { status: RefundStatus.FAILED },
        });

        throw new AppError(
          400,
          'customer-address-missing',
          'Cannot process refund - customer address not available'
        );
      }

      // Execute blockchain transaction
      const result = await this.blockchainService.executeRefund({
        network: refund.paymentSession.network as 'polygon' | 'ethereum',
        token: refund.paymentSession.token as 'USDC' | 'USDT',
        recipientAddress: refund.paymentSession.customerAddress,
        amount: Number(refund.amount),
      });

      if (!result.success) {
        // Mark refund as FAILED
        const failedRefund = await this.prisma.refund.update({
          where: { id },
          data: {
            status: RefundStatus.FAILED,
          },
          include: {
            paymentSession: true,
          },
        });

        // Queue webhook for refund.failed event
        await this.webhookService.queueWebhook(
          failedRefund.paymentSession.userId,
          'refund.failed',
          {
            id: failedRefund.id,
            payment_session_id: failedRefund.paymentSessionId,
            refund_id: failedRefund.id,
            amount: Number(failedRefund.amount),
            reason: failedRefund.reason,
            status: failedRefund.status,
            created_at: failedRefund.createdAt.toISOString(),
            error: result.error,
          }
        );

        throw new AppError(
          500,
          'blockchain-transaction-failed',
          `Refund transaction failed: ${result.error}`
        );
      }

      // Mark refund as COMPLETED with blockchain details
      const completedRefund = await this.prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.COMPLETED,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          completedAt: new Date(),
        },
        include: {
          paymentSession: true,
        },
      });

      // Queue webhook for refund.completed event
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
        }
      );

      // Check if payment should be marked as REFUNDED
      await this.updatePaymentStatusIfFullyRefunded(completedRefund.paymentSessionId);

      return completedRefund;
    } catch (error) {
      // If it's already an AppError, rethrow it (webhook already sent if applicable)
      if (error instanceof AppError) {
        throw error;
      }

      // Mark as FAILED for unexpected errors
      const failedRefund = await this.prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.FAILED,
        },
        include: {
          paymentSession: true,
        },
      });

      // Queue webhook for refund.failed event
      await this.webhookService.queueWebhook(
        failedRefund.paymentSession.userId,
        'refund.failed',
        {
          id: failedRefund.id,
          payment_session_id: failedRefund.paymentSessionId,
          refund_id: failedRefund.id,
          amount: Number(failedRefund.amount),
          reason: failedRefund.reason,
          status: failedRefund.status,
          created_at: failedRefund.createdAt.toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw new AppError(
        500,
        'refund-processing-failed',
        `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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

    // Check if payment should be marked as REFUNDED
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

    // Queue webhook for refund.failed event
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
   * Check if payment should be marked as REFUNDED and update if so
   *
   * Called after a refund completes to check if the total refunded amount
   * equals the original payment amount. If so, updates the payment status
   * to REFUNDED and emits payment.refunded webhook.
   */
  private async updatePaymentStatusIfFullyRefunded(paymentSessionId: string): Promise<void> {
    // Get payment with all refunds
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
      return; // Payment not found, nothing to do
    }

    // Calculate total refunded amount
    const totalRefunded = payment.refunds.reduce((sum, refund) => {
      return sum + Number(refund.amount);
    }, 0);

    const paymentAmount = Number(payment.amount);

    // Check if fully refunded (with small tolerance for floating point errors)
    const TOLERANCE = 0.01; // 1 cent
    if (Math.abs(totalRefunded - paymentAmount) < TOLERANCE) {
      // Update payment status to REFUNDED
      const updatedPayment = await this.prisma.paymentSession.update({
        where: { id: paymentSessionId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      // Queue webhook for payment.refunded event
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
