import { PrismaClient, PaymentSession, PaymentStatus } from '@prisma/client';
import { AppError, CreatePaymentSessionRequest, PaymentSessionResponse } from '../types/index.js';
import { generatePaymentSessionId } from '../utils/crypto.js';

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  async createPaymentSession(
    userId: string,
    data: CreatePaymentSessionRequest
  ): Promise<PaymentSession> {
    // Validate merchant address format
    if (!data.merchant_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new AppError(400, 'invalid-address', 'Invalid merchant wallet address');
    }

    const id = generatePaymentSessionId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const paymentSession = await this.prisma.paymentSession.create({
      data: {
        id,
        userId,
        amount: data.amount,
        currency: data.currency || 'USD',
        description: data.description,
        network: data.network || 'polygon',
        token: data.token || 'USDC',
        merchantAddress: data.merchant_address,
        successUrl: data.success_url,
        cancelUrl: data.cancel_url,
        metadata: data.metadata as any,
        expiresAt,
        status: 'PENDING',
      },
    });

    return paymentSession;
  }

  async getPaymentSession(id: string, userId: string): Promise<PaymentSession> {
    const session = await this.prisma.paymentSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw new AppError(404, 'not-found', 'Payment session not found');
    }

    return session;
  }

  async listPaymentSessions(
    userId: string,
    filters: {
      limit?: number;
      offset?: number;
      status?: PaymentStatus;
      network?: string;
      created_after?: Date;
      created_before?: Date;
    }
  ): Promise<{ data: PaymentSession[]; total: number }> {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.network) {
      where.network = filters.network;
    }

    if (filters.created_after || filters.created_before) {
      where.createdAt = {};
      if (filters.created_after) {
        where.createdAt.gte = filters.created_after;
      }
      if (filters.created_before) {
        where.createdAt.lte = filters.created_before;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.paymentSession.count({ where }),
    ]);

    return { data, total };
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    updates: {
      txHash?: string;
      blockNumber?: number;
      confirmations?: number;
      customerAddress?: string;
    }
  ): Promise<PaymentSession> {
    const data: any = { status };

    if (updates.txHash) {
      data.txHash = updates.txHash;
    }

    if (updates.blockNumber !== undefined) {
      data.blockNumber = updates.blockNumber;
    }

    if (updates.confirmations !== undefined) {
      data.confirmations = updates.confirmations;
    }

    if (updates.customerAddress) {
      data.customerAddress = updates.customerAddress;
    }

    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    const session = await this.prisma.paymentSession.update({
      where: { id },
      data,
    });

    return session;
  }

  toResponse(session: PaymentSession, baseUrl: string): PaymentSessionResponse {
    return {
      id: session.id,
      amount: Number(session.amount),
      currency: session.currency,
      description: session.description,
      status: session.status,
      network: session.network,
      token: session.token,
      merchant_address: session.merchantAddress,
      customer_address: session.customerAddress,
      tx_hash: session.txHash,
      block_number: session.blockNumber,
      confirmations: session.confirmations,
      checkout_url: `${baseUrl}/checkout/${session.id}`,
      success_url: session.successUrl,
      cancel_url: session.cancelUrl,
      metadata: session.metadata as any,
      created_at: session.createdAt.toISOString(),
      expires_at: session.expiresAt.toISOString(),
      completed_at: session.completedAt?.toISOString() || null,
    };
  }
}
