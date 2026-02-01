/**
 * Refund Query Service
 *
 * Handles read-only refund operations: lookup, listing, and response formatting.
 */

import { PrismaClient, Refund, RefundStatus } from '@prisma/client';
import { AppError } from '../types/index.js';

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

export class RefundQueryService {
  constructor(private prisma: PrismaClient) {}

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
        take: Math.min(filters.limit || 50, 100),
        skip: Math.max(filters.offset || 0, 0),
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { data, total };
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
