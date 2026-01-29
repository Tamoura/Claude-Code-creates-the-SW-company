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
    // If not configured, refunds can still be created but won't execute on-chain
    try {
      this.blockchainService = new BlockchainTransactionService();
    } catch (error) {
      this.blockchainService = null;
      // Log warning but don't fail - allows testing without wallet
    }
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
      throw new AppError(
        500,
        'blockchain-service-unavailable',
        'Blockchain service not configured - MERCHANT_WALLET_PRIVATE_KEY required'
      );
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
        await this.prisma.refund.update({
          where: { id },
          data: {
            status: RefundStatus.FAILED,
          },
        });

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

      return completedRefund;
    } catch (error) {
      // If it's already an AppError, rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // Mark as FAILED for unexpected errors
      await this.prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.FAILED,
        },
      });

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
