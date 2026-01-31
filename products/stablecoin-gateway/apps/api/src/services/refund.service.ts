/**
 * Refund Service (Facade)
 *
 * Delegates to RefundQueryService, RefundFinalizationService,
 * and handles refund creation and processing internally.
 *
 * All public API methods remain identical to preserve consumer imports.
 */

import { PrismaClient, Refund, RefundStatus, PaymentStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { AppError } from '../types/index.js';
import { generateRefundId } from '../utils/crypto.js';
import { WebhookDeliveryService } from './webhook-delivery.service.js';
import { BlockchainTransactionService } from './blockchain-transaction.service.js';
import { BlockchainMonitorService } from './blockchain-monitor.service.js';
import { RefundQueryService } from './refund-query.service.js';
import type { RefundResponse } from './refund-query.service.js';
import {
  RefundFinalizationService,
  computeRefundedTotal,
  computeRemainingAmount,
} from './refund-finalization.service.js';
import type { ConfirmFinalityResult } from './refund-finalization.service.js';

// Re-export types and utilities so existing consumers don't break
export { computeRefundedTotal, computeRemainingAmount };
export type { RefundResponse, ConfirmFinalityResult };

export interface CreateRefundRequest {
  amount: number;
  reason?: string;
  idempotencyKey?: string;
}

export class RefundService {
  private webhookService: WebhookDeliveryService;
  private blockchainService: BlockchainTransactionService | null;
  private queryService: RefundQueryService;
  private finalizationService: RefundFinalizationService;

  constructor(private prisma: PrismaClient) {
    this.webhookService = new WebhookDeliveryService(prisma);
    const blockchainMonitor = new BlockchainMonitorService();

    // Initialize sub-services
    this.queryService = new RefundQueryService(prisma);
    this.finalizationService = new RefundFinalizationService(
      prisma,
      this.webhookService,
      blockchainMonitor
    );

    // Initialize blockchain service if merchant wallet is configured
    try {
      this.blockchainService = new BlockchainTransactionService();
    } catch (error) {
      this.blockchainService = null;

      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'BlockchainTransactionService initialization failed in production. ' +
          'Refunds cannot be processed without blockchain access. ' +
          `Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      console.warn(
        'BlockchainTransactionService not available. ' +
        'Refunds will be created but not executed on-chain. ' +
        'This is only acceptable in development/test environments.'
      );
    }
  }

  isBlockchainAvailable(): boolean {
    return this.blockchainService !== null;
  }

  /**
   * Create a refund request for a completed payment.
   *
   * Uses FOR UPDATE lock to prevent concurrent over-refunding.
   */
  /**
   * Create a refund request for a completed payment.
   *
   * Supports idempotency via the `idempotencyKey` field. When a key
   * is provided and a refund with the same key + paymentSessionId
   * already exists:
   * - If the existing refund has matching parameters → return it (200)
   * - If the parameters differ → throw 409 Conflict
   *
   * Uses FOR UPDATE lock to prevent concurrent over-refunding.
   */
  async createRefund(
    userId: string,
    paymentSessionId: string,
    data: CreateRefundRequest
  ): Promise<Refund> {
    if (data.amount <= 0) {
      throw new AppError(400, 'invalid-refund-amount', 'Refund amount must be greater than 0');
    }

    // Idempotency check: if key provided, look for existing refund
    if (data.idempotencyKey) {
      const existing = await this.prisma.refund.findUnique({
        where: {
          refund_idempotency: {
            paymentSessionId,
            idempotencyKey: data.idempotencyKey,
          },
        },
      });

      if (existing) {
        // Verify parameters match (amount and reason)
        if (
          !new Decimal(existing.amount).equals(new Decimal(data.amount)) ||
          (existing.reason || null) !== (data.reason || null)
        ) {
          throw new AppError(
            409,
            'idempotency-mismatch',
            'A refund with this idempotency key already exists with different parameters'
          );
        }
        // Same parameters — return existing refund (idempotent)
        return existing;
      }
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT 1 FROM "payment_sessions"
        WHERE id = ${paymentSessionId} AND user_id = ${userId}
        FOR UPDATE
      `;

      const payment = await tx.paymentSession.findFirst({
        where: { id: paymentSessionId, userId },
        include: { refunds: true },
      });

      if (!payment) {
        throw new AppError(404, 'payment-not-found', 'Payment session not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new AppError(
          400,
          'payment-not-completed',
          'Payment must be completed before refunding'
        );
      }

      const totalRefunded = computeRefundedTotal(
        payment.refunds
          .filter((r) => r.status !== RefundStatus.FAILED)
          .map((r) => ({ amount: r.amount.toString(), status: r.status }))
      );

      const remainingAmount = computeRemainingAmount(payment.amount.toString(), totalRefunded);

      if (new Decimal(data.amount).greaterThan(remainingAmount)) {
        throw new AppError(
          400,
          'refund-exceeds-payment',
          `Refund amount (${data.amount}) exceeds remaining refundable amount (${remainingAmount.toNumber()})`
        );
      }

      return tx.refund.create({
        data: {
          id: generateRefundId(),
          paymentSessionId,
          amount: data.amount,
          reason: data.reason,
          idempotencyKey: data.idempotencyKey,
          status: RefundStatus.PENDING,
        },
      });
    }, {
      timeout: 10000,
    });

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

  // Delegate to query service
  async getRefund(id: string, userId: string): Promise<Refund> {
    return this.queryService.getRefund(id, userId);
  }

  async listRefunds(
    userId: string,
    filters: {
      paymentSessionId?: string;
      status?: RefundStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: Refund[]; total: number }> {
    return this.queryService.listRefunds(userId, filters);
  }

  toResponse(refund: Refund): RefundResponse {
    return this.queryService.toResponse(refund);
  }

  /**
   * Process a refund (execute blockchain transaction)
   */
  async processRefund(id: string): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { paymentSession: true },
    });

    if (!refund) {
      throw new AppError(404, 'refund-not-found', 'Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new AppError(400, 'invalid-refund-status', 'Refund must be in PENDING status to process');
    }

    if (!this.blockchainService) {
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(500, 'blockchain-service-unavailable', 'Cannot process refund: blockchain service unavailable');
      }
      console.warn(`Skipping on-chain refund for ${id} - no blockchain service`);
      return refund;
    }

    await this.prisma.refund.update({
      where: { id },
      data: { status: RefundStatus.PROCESSING },
    });

    try {
      if (!refund.paymentSession.customerAddress) {
        await this.prisma.refund.update({
          where: { id },
          data: { status: RefundStatus.FAILED },
        });
        throw new AppError(400, 'customer-address-missing', 'Cannot process refund - customer address not available');
      }

      const result = await this.blockchainService.executeRefund({
        network: refund.paymentSession.network as 'polygon' | 'ethereum',
        token: refund.paymentSession.token as 'USDC' | 'USDT',
        recipientAddress: refund.paymentSession.customerAddress,
        amount: refund.amount.toString(),
      });

      if (!result.success) {
        const failedRefund = await this.prisma.refund.update({
          where: { id },
          data: { status: RefundStatus.FAILED },
          include: { paymentSession: true },
        });

        await this.webhookService.queueWebhook(failedRefund.paymentSession.userId, 'refund.failed', {
          id: failedRefund.id,
          payment_session_id: failedRefund.paymentSessionId,
          refund_id: failedRefund.id,
          amount: Number(failedRefund.amount),
          reason: failedRefund.reason,
          status: failedRefund.status,
          created_at: failedRefund.createdAt.toISOString(),
          error: result.error,
        });

        throw new AppError(500, 'blockchain-transaction-failed', `Refund transaction failed: ${result.error}`);
      }

      const processingRefund = await this.prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.PROCESSING,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
        },
        include: { paymentSession: true },
      });

      await this.webhookService.queueWebhook(processingRefund.paymentSession.userId, 'refund.processing', {
        id: processingRefund.id,
        payment_session_id: processingRefund.paymentSessionId,
        amount: Number(processingRefund.amount),
        reason: processingRefund.reason,
        status: processingRefund.status,
        tx_hash: processingRefund.txHash,
        block_number: processingRefund.blockNumber,
        created_at: processingRefund.createdAt.toISOString(),
        pending_confirmations: result.pendingConfirmations,
      });

      return processingRefund;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const failedRefund = await this.prisma.refund.update({
        where: { id },
        data: { status: RefundStatus.FAILED },
        include: { paymentSession: true },
      });

      await this.webhookService.queueWebhook(failedRefund.paymentSession.userId, 'refund.failed', {
        id: failedRefund.id,
        payment_session_id: failedRefund.paymentSessionId,
        refund_id: failedRefund.id,
        amount: Number(failedRefund.amount),
        reason: failedRefund.reason,
        status: failedRefund.status,
        created_at: failedRefund.createdAt.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(
        500,
        'refund-processing-failed',
        `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Delegate to finalization service
  async completeRefund(id: string, txHash: string, blockNumber?: number): Promise<Refund> {
    return this.finalizationService.completeRefund(id, txHash, blockNumber);
  }

  async failRefund(id: string): Promise<Refund> {
    return this.finalizationService.failRefund(id);
  }

  async confirmRefundFinality(
    refundId: string,
    txHash: string,
    network: 'polygon' | 'ethereum'
  ): Promise<ConfirmFinalityResult> {
    return this.finalizationService.confirmRefundFinality(refundId, txHash, network);
  }
}
