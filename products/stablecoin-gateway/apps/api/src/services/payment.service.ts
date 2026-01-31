import { PrismaClient, PaymentSession, PaymentStatus, Prisma } from '@prisma/client';
import { AppError, CreatePaymentSessionRequest, PaymentSessionResponse } from '../types/index.js';
import { generatePaymentSessionId } from '../utils/crypto.js';
import { validatePaymentStatusTransition } from '../utils/payment-state-machine.js';
import { WebhookDeliveryService } from './webhook-delivery.service.js';

export class PaymentService {
  private webhookService: WebhookDeliveryService;

  constructor(private prisma: PrismaClient) {
    this.webhookService = new WebhookDeliveryService(prisma);
  }

  /**
   * Create a new payment session
   *
   * Note: Input validation is handled by createPaymentSessionSchema in the route handler.
   * This ensures all addresses are checksummed and valid before reaching this service.
   * Idempotency key is passed separately from header (not body) per API contract.
   */
  async createPaymentSession(
    userId: string,
    data: CreatePaymentSessionRequest,
    idempotencyKey?: string
  ): Promise<PaymentSession> {
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
        idempotencyKey,
        expiresAt,
        status: 'PENDING',
      },
    });

    // Queue webhook for payment.created event
    await this.webhookService.queueWebhook(userId, 'payment.created', {
      id: paymentSession.id,
      amount: Number(paymentSession.amount),
      currency: paymentSession.currency,
      status: paymentSession.status,
      network: paymentSession.network,
      token: paymentSession.token,
      merchant_address: paymentSession.merchantAddress,
      created_at: paymentSession.createdAt.toISOString(),
      expires_at: paymentSession.expiresAt.toISOString(),
      metadata: paymentSession.metadata,
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
    const where: Prisma.PaymentSessionWhereInput = { userId };

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

  /**
   * ADR: Concurrent Payment State Transition Safety
   *
   * SELECT ... FOR UPDATE is used to acquire an exclusive row-level lock
   * inside the transaction. Without this, two blockchain confirmation
   * events arriving simultaneously could both read the current status
   * (e.g. CONFIRMING), both validate the transition to COMPLETED, and
   * both write COMPLETED -- causing duplicate webhooks, double accounting,
   * and corrupted state. The pessimistic lock serializes concurrent
   * writers so only the first succeeds and the second sees the already-
   * transitioned row.
   *
   * Webhook queuing is intentionally performed OUTSIDE the transaction.
   * Webhooks involve HTTP calls to merchant endpoints with unpredictable
   * latency (timeouts up to 30s). Holding a FOR UPDATE row lock during
   * an outbound HTTP call would block all other transactions touching
   * that row, creating a bottleneck that could cascade into database
   * connection pool exhaustion under load.
   *
   * The state machine permits idempotent same-state transitions
   * (e.g. COMPLETED -> COMPLETED) so that duplicate blockchain events
   * or at-least-once delivery retries are handled gracefully without
   * throwing errors. This is critical for distributed systems where
   * exactly-once delivery is impractical.
   *
   * Alternatives considered:
   * - Optimistic locking (version column): Rejected because blockchain
   *   events arrive in bursts and retry storms would degrade throughput
   *   more than a brief row lock.
   * - Application-level mutex (Redis): Rejected because it adds an
   *   external dependency to a critical path and cannot guarantee
   *   atomicity with the database write.
   * - Queuing all updates through a single worker: Rejected because it
   *   introduces a single point of failure and unnecessary latency for
   *   the common non-contended case.
   */
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
    // Perform the state transition inside a transaction with row-level lock
    const session = await this.prisma.$transaction(async (tx) => {
      // Acquire exclusive lock on the payment row to prevent concurrent updates
      const rows = await tx.$queryRaw<PaymentSession[]>`
        SELECT * FROM "payment_sessions"
        WHERE id = ${id}
        FOR UPDATE
      `;

      const existingSession = rows[0];
      if (!existingSession) {
        throw new AppError(404, 'not-found', 'Payment session not found');
      }

      // Enforce state machine: validate transition
      validatePaymentStatusTransition(existingSession.status, status);

      // Enforce payment session expiry before allowing CONFIRMING or COMPLETED
      if (status === 'CONFIRMING' || status === 'COMPLETED') {
        if (
          existingSession.expiresAt &&
          new Date(existingSession.expiresAt) < new Date()
        ) {
          await tx.paymentSession.update({
            where: { id },
            data: { status: 'FAILED' },
          });
          throw new AppError(
            400,
            'session-expired',
            'Payment session has expired'
          );
        }
      }

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

      return tx.paymentSession.update({
        where: { id },
        data,
      });
    });

    // Queue webhooks OUTSIDE the transaction (side effects)
    if (status === 'CONFIRMING') {
      await this.webhookService.queueWebhook(session.userId, 'payment.confirming', {
        id: session.id,
        amount: Number(session.amount),
        currency: session.currency,
        status: session.status,
        network: session.network,
        token: session.token,
        merchant_address: session.merchantAddress,
        customer_address: session.customerAddress,
        tx_hash: session.txHash,
        block_number: session.blockNumber,
        confirmations: session.confirmations,
        created_at: session.createdAt.toISOString(),
        metadata: session.metadata,
      });
    } else if (status === 'COMPLETED') {
      await this.webhookService.queueWebhook(session.userId, 'payment.completed', {
        id: session.id,
        amount: Number(session.amount),
        currency: session.currency,
        status: session.status,
        network: session.network,
        token: session.token,
        merchant_address: session.merchantAddress,
        customer_address: session.customerAddress,
        tx_hash: session.txHash,
        block_number: session.blockNumber,
        confirmations: session.confirmations,
        created_at: session.createdAt.toISOString(),
        completed_at: session.completedAt?.toISOString() || null,
        metadata: session.metadata,
      });
    } else if (status === 'FAILED') {
      await this.webhookService.queueWebhook(session.userId, 'payment.failed', {
        id: session.id,
        amount: Number(session.amount),
        currency: session.currency,
        status: session.status,
        network: session.network,
        token: session.token,
        merchant_address: session.merchantAddress,
        created_at: session.createdAt.toISOString(),
        metadata: session.metadata,
      });
    } else if (status === 'REFUNDED') {
      await this.webhookService.queueWebhook(session.userId, 'payment.refunded', {
        id: session.id,
        amount: Number(session.amount),
        currency: session.currency,
        status: session.status,
        network: session.network,
        token: session.token,
        merchant_address: session.merchantAddress,
        customer_address: session.customerAddress,
        created_at: session.createdAt.toISOString(),
        metadata: session.metadata,
      });
    }

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
